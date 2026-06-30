console.log("Running from:", import.meta.url); // restarted2

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";

import { pool } from "./db.js";
import { verifyToken } from "./middleware/auth.js";
import { fetchDaaGradePayload } from "./services/daaGradeSyncService.js";
import {
  createStudentGradeImport,
  importStudentGrades,
} from "./services/studentGradeImportService.js";
import {
  fetchDaaTimetablePayload,
  fetchDaaExamPayload,
} from "./services/daaScheduleSyncService.js";
import {
  saveStudentTimetable,
  saveStudentExams,
} from "./services/studentScheduleImportService.js";

import {
  ensureMessagingSchema,
  getConversationParticipantUserIds,
  emitMessageNew,
  emitMessageRead,
} from "./services/messagingService.js";
import {
  notifyNewMessageByEmail,
  sendPasswordResetEmail,
} from "./services/emailService.js";
import { studentEmail } from "./utils/uitEmail.js";

import advisorRouter from "./routes/Advisorroutes.js";
import appointmentRouter from "./routes/appointmentRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import messagingRouter from "./routes/messagingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import aiAnomalyRouter from "./routes/aiAnomalyRoutes.js";
import aiQueryRouter from "./routes/aiQueryRoutes.js";
import gradeInsightRouter from "./routes/gradeInsightRoutes.js";
import uitFaqRouter from "./routes/uitFaqRoutes.js";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "uit_advisorhub_secret_2026";

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

const getMessageReaderRole = (role) => {
  return normalizeRole(role) === "STUDENT" ? "STUDENT" : "ADVISOR";
};

const getConversationForUser = async (conversationId, user) => {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.advisor_id,
      c.student_id,
      student_user.id AS student_user_id
    FROM conversations c
    LEFT JOIN users student_user ON student_user.student_id = c.student_id
    WHERE c.id = $1
    LIMIT 1
    `,
    [conversationId]
  );

  const conversation = result.rows[0];
  if (!conversation) return null;

  const role = normalizeRole(user.role);
  const userId = Number(user.id);
  const userStudentId = Number(user.student_id);
  const advisorId = Number(conversation.advisor_id);
  const studentId = Number(conversation.student_id);
  const studentUserId = Number(conversation.student_user_id);

  const canAccess =
    role === "ADMIN" ||
    (role === "ADVISOR" && advisorId === userId) ||
    (role === "STUDENT" && (studentId === userStudentId || studentUserId === userId));

  return canAccess ? conversation : null;
};

const getMessageUnreadSenderRole = (role) =>
  normalizeRole(role) === "STUDENT" ? "ADVISOR" : "STUDENT";

const canAdvisorAccessStudent = async (advisorId, studentId) => {
  const result = await pool.query(
    `
    SELECT 1
    FROM students s
    JOIN advisor_class ac ON ac.class_code = s.class_code
    WHERE ac.advisor_id = $1
      AND s.id = $2
    LIMIT 1
    `,
    [advisorId, studentId]
  );

  return result.rows.length > 0;
};

// CORS: cho phép mọi origin (local dev + production)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép curl / Postman (không có origin) và các origin trong danh sách
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} không được phép`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Lưu ảnh avatar/cover TRỰC TIẾP TRONG DB (cột TEXT, dạng data URL base64) thay vì
// ghi ra ổ đĩa: máy chủ free (Render...) có filesystem ephemeral nên file upload sẽ
// bị xoá sau mỗi lần redeploy → ảnh "biến mất". Dùng memoryStorage để lấy buffer rồi
// chuyển sang base64. Client đã nén ảnh nhỏ trước khi gửi nên dung lượng DB hợp lý;
// limit 4MB chỉ là chốt chặn an toàn.
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Chỉ chấp nhận tệp ảnh."));
  },
});

// ==========================================
// SOCKET.IO
// ==========================================
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Một client đã kết nối:", socket.id);

  socket.on("join_user", (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user room ${userId}`);
  });

  socket.on("join_conversation", (conversationId) => {
    socket.join(`conv_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on("send_message", async (data) => {
    const { conversationId, senderId, senderRole, content } = data;

    try {
      const result = await pool.query(
        `
        INSERT INTO messages (conversation_id, sender_role, sender_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [conversationId, senderRole, senderId, content]
      );

      const newMessage = result.rows[0];

      io.to(`conv_${conversationId}`).emit("new_message", newMessage);

      // Fan-out chuẩn hoá tới phòng user của 2 phía (cho UI sinh viên mới) + email.
      try {
        const parts = await getConversationParticipantUserIds(conversationId);
        if (parts) {
          const key = `advisor:${conversationId}`;
          const normalized = {
            id: Number(newMessage.id),
            key,
            sender_id: Number(newMessage.sender_id),
            content: newMessage.content,
            created_at: newMessage.created_at,
            is_read: Boolean(newMessage.is_read),
          };
          emitMessageNew(io, {
            key,
            message: normalized,
            userIds: [parts.advisorUserId, parts.studentUserId],
          });

          const recipientUserId =
            Number(senderId) === parts.advisorUserId
              ? parts.studentUserId
              : parts.advisorUserId;
          notifyNewMessageByEmail({
            io,
            recipientUserId,
            senderUserId: Number(senderId),
            content,
          }).catch(() => {});
        }
      } catch (fanoutErr) {
        console.error("[send_message fanout]", fanoutErr.message);
      }
    } catch (err) {
      console.error("Lỗi khi lưu/gửi tin nhắn:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client ngắt kết nối:", socket.id);
  });
});

const ensureUserProfileColumns = async () => {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS cover_url TEXT
  `);
};

// Bảng lưu token đặt lại mật khẩu. Chỉ lưu SHA-256 của token (không lưu token thô)
// để nếu DB lộ vẫn không dùng lại được. Idempotent — chạy lúc khởi động.
const ensurePasswordResetSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         BIGSERIAL PRIMARY KEY,
      user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash
      ON password_reset_tokens(token_hash);
  `);
};

// URL gốc của frontend để dựng link đặt lại mật khẩu trong email.
// Ưu tiên: APP_BASE_URL/FRONTEND_URL (env) → Origin của request (nơi người dùng đang
// thực sự đứng) → origin production đầu tiên trong ALLOWED_ORIGINS → localhost dev.
const getAppBaseUrl = (req) => {
  const explicit = process.env.APP_BASE_URL || process.env.FRONTEND_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  const fromAllowed = allowedOrigins.find(
    (o) => o && o !== "*" && !/localhost|127\.0\.0\.1/.test(o)
  );
  if (fromAllowed) return fromAllowed.replace(/\/+$/, "");

  return "http://localhost:5173";
};

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ==========================================
// LOGIN
// ==========================================
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        password_hash,
        full_name,
        role,
        student_id,
        avatar_url,
        cover_url,
        bio
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email không tồn tại" });
    }

    const user = result.rows[0];
    const normalizedUserRole = normalizeRole(user.role);

    let isValid = false;

    if (
      typeof user.password_hash === "string" &&
      user.password_hash.startsWith("$2")
    ) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else {
      isValid = password === user.password_hash;
    }

    if (!isValid) {
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: normalizedUserRole,
        student_id: user.student_id,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: normalizedUserRole,
        student_id: user.student_id,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// QUÊN MẬT KHẨU - gửi email chứa link đặt lại
// ==========================================
app.post("/auth/forgot-password", async (req, res) => {
  // Luôn trả về thông điệp chung để KHÔNG lộ email nào có/không tồn tại (chống dò email).
  const GENERIC = {
    message:
      "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.",
  };

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập địa chỉ email." });
    }

    const result = await pool.query(
      `
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, s.mssv
      FROM users u
      LEFT JOIN students s ON s.id = u.student_id
      WHERE LOWER(u.email) = $1
      LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    // Không tồn tại / đã bị vô hiệu hoá → vẫn trả về thông điệp chung.
    if (!user || user.is_active === false) {
      return res.json(GENERIC);
    }

    // Tài khoản sinh viên (@gm.uit.edu.vn) đăng nhập bằng phiên DAA, không có mật khẩu
    // để đặt lại → KHÔNG gửi link. Vẫn trả thông điệp chung để không lộ thông tin.
    const isStudentAccount =
      normalizeRole(user.role) === "STUDENT" ||
      Boolean(user.mssv) ||
      String(user.email || "").toLowerCase().endsWith("@gm.uit.edu.vn");
    if (isStudentAccount) {
      return res.json(GENERIC);
    }

    const recipientEmail = user.email || (user.mssv ? studentEmail(user.mssv) : null);
    if (!recipientEmail) {
      return res.json(GENERIC);
    }

    // Sinh token thô (gửi qua email) và lưu HASH của nó vào DB.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 phút

    // Vô hiệu hoá các token cũ chưa dùng của user này, rồi tạo token mới.
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${getAppBaseUrl(req)}/reset-password?token=${rawToken}`;

    // Gửi email không đồng bộ — không để lỗi SMTP làm chậm/lộ thông tin phản hồi.
    sendPasswordResetEmail({
      to: recipientEmail,
      recipientName: user.full_name,
      resetUrl,
      expiresMinutes: 30,
    })
      .then((r) =>
        console.log(
          `[forgot-password] -> ${recipientEmail}:`,
          r?.sent ? "ĐÃ GỬI ✅" : `bỏ qua (${r?.reason || "unknown"})`
        )
      )
      .catch((err) =>
        console.error("[forgot-password] LỖI gửi email:", err.message)
      );

    return res.json(GENERIC);
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// Kiểm tra nhanh token còn hợp lệ không — để trang /reset-password báo sớm cho người dùng.
app.get("/auth/reset-password/validate", async (req, res) => {
  try {
    const token = String(req.query?.token || "").trim();
    if (!token) return res.status(400).json({ valid: false });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const result = await pool.query(
      `SELECT expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    const row = result.rows[0];
    const valid = Boolean(
      row && !row.used_at && new Date(row.expires_at).getTime() >= Date.now()
    );
    return res.json({ valid });
  } catch (err) {
    console.error("VALIDATE RESET TOKEN ERROR:", err);
    return res.status(500).json({ valid: false });
  }
});

// Đặt lại mật khẩu bằng token. Token chỉ dùng được một lần và phải còn hạn.
app.post("/auth/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token) {
      return res.status(400).json({ message: "Thiếu mã đặt lại mật khẩu." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const result = await pool.query(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );
    const row = result.rows[0];

    if (
      !row ||
      row.used_at ||
      new Date(row.expires_at).getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      row.user_id,
    ]);
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [row.id]
    );

    return res.json({
      message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// ĐỔI MẬT KHẨU (đang đăng nhập) - cần mật khẩu cũ
// ==========================================
app.post("/auth/change-password", verifyToken, async (req, res) => {
  try {
    const oldPassword = String(req.body?.oldPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới." });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }
    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải khác mật khẩu cũ." });
    }

    const result = await pool.query(
      `SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    // Xác minh mật khẩu cũ — hỗ trợ cả bcrypt lẫn plaintext giống /auth/login.
    let isValid = false;
    if (
      typeof user.password_hash === "string" &&
      user.password_hash.startsWith("$2")
    ) {
      isValid = await bcrypt.compare(oldPassword, user.password_hash);
    } else {
      isValid = oldPassword === user.password_hash;
    }
    if (!isValid) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      newHash,
      user.id,
    ]);

    return res.json({ message: "Đổi mật khẩu thành công." });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// LOGIN WITH A STUDENT DAA SESSION
// ==========================================
app.post("/auth/daa-login", async (req, res) => {
  try {
    const mssv = String(req.body?.mssv || "").trim();
    const cookie = String(req.body?.cookie || "");

    if (!/^\d{6,12}$/.test(mssv) || !cookie.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập đúng MSSV và cookie phiên DAA.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.student_id,
        u.avatar_url,
        u.cover_url,
        u.bio,
        s.mssv
      FROM students s
      JOIN users u ON u.student_id = s.id
      WHERE s.mssv = $1
        AND UPPER(u.role) = 'STUDENT'
      LIMIT 1
      `,
      [mssv]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        message: "MSSV chưa được Admin tạo tài khoản trên AdvisorHub.",
      });
    }

    const user = result.rows[0];
    const payload = await fetchDaaGradePayload({ cookie, mssv });

    if (payload.student?.class_code) {
      const cohort = mssv.length >= 2 ? `20${mssv.slice(0, 2)}` : 'Chưa cập nhật';
      await pool.query(
        `
        INSERT INTO admin_classes (code, name, cohort, program)
        VALUES ($1, $1, $2, 'Chưa cập nhật')
        ON CONFLICT (code) DO NOTHING
        `,
        [payload.student.class_code, cohort]
      );
    }

    await pool.query(
      `
      UPDATE students
      SET
        full_name = COALESCE(NULLIF($1, ''), full_name),
        class_code = COALESCE(NULLIF($2, ''), class_code)
      WHERE id = $3
      `,
      [payload.student?.full_name || '', payload.student?.class_code || '', user.student_id]
    );

    if (payload.student?.full_name) {
      await pool.query(`UPDATE users SET full_name = $1 WHERE id = $2`, [
        payload.student.full_name,
        user.id,
      ]);
      user.full_name = payload.student.full_name;
    }

    const gradeImport = await createStudentGradeImport({
      student: {
        id: user.student_id,
        mssv: user.mssv,
      },
      payload,
    });

    if (gradeImport.mismatch) {
      return res.status(403).json({ message: gradeImport.error_message });
    }

    const syncResult = await importStudentGrades({
      importId: gradeImport.import.id,
      user: {
        id: user.id,
        role: "STUDENT",
        student_id: user.student_id,
      },
    });

    if (syncResult.status !== 200) {
      return res.status(syncResult.status).json(syncResult.body);
    }

    // Đồng bộ TKB + Lịch thi bằng cùng cookie. Không chặn đăng nhập nếu lỗi
    // (lịch là phụ; điểm mới là bắt buộc). Thu kết quả để trả về cho client.
    //
    // Lưu ý: trang TKB GET không tham số -> trả học kỳ hiện tại. Trang lịch thi
    // BẮT BUỘC có lanthi/hocky/namhoc mới render bảng -> phải lấy học kỳ từ TKB
    // trước, rồi mới fetch lịch thi (cả GK lẫn CK) theo đúng học kỳ đó.
    const scheduleSync = { timetable: null, exams: null };
    let currentSemester = null;

    try {
      const tkbPayload = await fetchDaaTimetablePayload({ cookie, mssv });
      currentSemester = tkbPayload.semester;
      const saved = await saveStudentTimetable({
        studentId: user.student_id,
        payload: tkbPayload,
      });
      scheduleSync.timetable = {
        detected_count: tkbPayload.entries.length,
        imported_count: saved.imported_count,
        semester: saved.semester,
      };
    } catch (tkbErr) {
      console.error("[auth/daa-login] TKB", tkbErr.message);
    }

    // "HK2-2025" -> { hocky: '2', namhoc: '2025' }
    const semMatch = String(currentSemester || "").match(/^HK(\d)-(\d{4})$/);
    if (semMatch) {
      const [, hocky, namhoc] = semMatch;
      let examImported = 0;
      let examDetected = 0;
      // lanthi: 1 = GK, 2 = CK
      const examRuns = await Promise.allSettled([
        fetchDaaExamPayload({ cookie, mssv, lanthi: 1, hocky, namhoc }),
        fetchDaaExamPayload({ cookie, mssv, lanthi: 2, hocky, namhoc }),
      ]);
      for (const run of examRuns) {
        if (run.status !== "fulfilled") {
          console.error("[auth/daa-login] fetch exams", run.reason?.message);
          continue;
        }
        examDetected += run.value.entries.length;
        try {
          const saved = await saveStudentExams({
            studentId: user.student_id,
            payload: run.value,
          });
          examImported += saved.imported_count;
        } catch (saveErr) {
          console.error("[auth/daa-login] save exams", saveErr.message);
        }
      }
      scheduleSync.exams = {
        detected_count: examDetected,
        imported_count: examImported,
        semester: currentSemester,
      };
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: "STUDENT",
        student_id: user.student_id,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Đăng nhập bằng DAA thành công.",
      token,
      grade_sync: {
        detected_count: payload.courses.length,
        imported_count: syncResult.body.imported_count,
        skipped_count: syncResult.body.skipped_count,
      },
      schedule_sync: scheduleSync,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: "STUDENT",
        student_id: user.student_id,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        bio: user.bio,
      },
    });
  } catch (err) {
    // The full Axios error contains request headers, including the DAA cookie.
    console.error("[auth/daa-login]", err.message);
    const status =
      /cookie|phiên|MSSV|không tìm thấy bảng điểm|không hợp lệ/i.test(err.message)
        ? 401
        : 502;
    return res.status(status).json({
      message: err.message || "Không thể xác thực phiên DAA.",
    });
  }
});

// ==========================================
// UPDATE PROFILE
// ==========================================
// Bọc multer để lỗi upload (quá lớn / sai định dạng) trả JSON gọn thay vì HTML 500.
const profileUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]);
const handleProfileUpload = (req, res, next) => {
  profileUpload(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Ảnh quá lớn (tối đa 4MB).'
        : (err.message || 'Tải ảnh thất bại.');
      return res.status(400).json({ message });
    }
    next();
  });
};

app.put("/auth/profile", verifyToken, handleProfileUpload, async (req, res) => {
  try {
    const { bio } = req.body;
    let avatarUrl = undefined;
    let coverUrl = undefined;

    // Lưu thẳng ảnh vào DB dưới dạng data URL base64 (bền vững qua mỗi lần deploy).
    const toDataUrl = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        avatarUrl = toDataUrl(req.files.avatar[0]);
      }
      if (req.files.cover && req.files.cover[0]) {
        coverUrl = toDataUrl(req.files.cover[0]);
      }
    }

    // Dynamic update query
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramIndex++}`);
      queryParams.push(bio);
    }
    if (avatarUrl !== undefined) {
      updateFields.push(`avatar_url = $${paramIndex++}`);
      queryParams.push(avatarUrl);
    }
    if (coverUrl !== undefined) {
      updateFields.push(`cover_url = $${paramIndex++}`);
      queryParams.push(coverUrl);
    }

    if (updateFields.length > 0) {
      queryParams.push(req.user.id);
      await pool.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`, queryParams);
    }

    const result = await pool.query(
      "SELECT id, email, full_name, role, student_id, bio, avatar_url, cover_url FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const user = result.rows[0];
    return res.json({
      message: "Cập nhật hồ sơ thành công",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        student_id: user.student_id,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// PROTECTED ROUTES
// ==========================================
app.use("/advisor", verifyToken, advisorRouter);
app.use("/appointments", verifyToken, appointmentRouter);
app.use("/student", verifyToken, studentRouter);
app.use("/messaging", verifyToken, messagingRouter);
app.use("/admin", verifyToken, adminRouter);
app.use("/ai", verifyToken, aiQueryRouter);
app.use("/ai", verifyToken, aiAnomalyRouter);
app.use("/ai", verifyToken, gradeInsightRouter);

// ==========================================
// UIT FAQ — PUBLIC (không cần đăng nhập)
// ==========================================
app.use("/uit-faq", uitFaqRouter);

// ==========================================
// ADMIN - TẠO ADVISOR
// ==========================================
app.post("/admin/advisors", verifyToken, async (req, res) => {
  try {
    if (normalizeRole(req.user.role) !== "ADMIN") {
      return res.status(403).json({ message: "Chỉ ADMIN mới được truy cập" });
    }

    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'ADVISOR')
      RETURNING id, email, full_name, role, created_at
      `,
      [email, password, full_name || null]
    );

    return res.status(201).json({
      message: "Tạo cố vấn thành công",
      advisor: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE ADVISOR ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// ADMIN - TẠO CLASS
// ==========================================
app.post("/admin/classes", verifyToken, async (req, res) => {
  try {
    if (normalizeRole(req.user.role) !== "ADMIN") {
      return res.status(403).json({ message: "Chỉ ADMIN mới được truy cập" });
    }

    const { code, name, cohort, program } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Thiếu mã lớp" });
    }

    const existing = await pool.query(
      `SELECT code FROM admin_classes WHERE code = $1`,
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Lớp đã tồn tại" });
    }

    const result = await pool.query(
      `
      INSERT INTO admin_classes (code, name, cohort, program)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [code, name || null, cohort || null, program || null]
    );

    return res.status(201).json({
      message: "Tạo lớp thành công",
      class: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE CLASS ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// ADMIN - GÁN ADVISOR CHO LỚP
// ==========================================
app.post("/admin/assign-advisor", verifyToken, async (req, res) => {
  try {
    if (normalizeRole(req.user.role) !== "ADMIN") {
      return res.status(403).json({ message: "Chỉ ADMIN mới được truy cập" });
    }

    const { advisor_user_id, class_id } = req.body;

    if (!advisor_user_id || !class_id) {
      return res
        .status(400)
        .json({ message: "Thiếu advisor_user_id hoặc class_id" });
    }

    const advisorCheck = await pool.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [advisor_user_id]
    );

    if (advisorCheck.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy cố vấn" });
    }

    if (normalizeRole(advisorCheck.rows[0].role) !== "ADVISOR") {
      return res.status(400).json({ message: "User này không phải ADVISOR" });
    }

    const classCheck = await pool.query(
      `SELECT code FROM admin_classes WHERE code = $1`,
      [class_id]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lớp" });
    }

    const result = await pool.query(
      `
      INSERT INTO advisor_class (advisor_id, class_code)
      VALUES ($1, $2)
      ON CONFLICT (advisor_id, class_code) DO NOTHING
      RETURNING *
      `,
      [advisor_user_id, class_id]
    );

    return res.json({
      message:
        result.rows.length > 0
          ? "Gán cố vấn cho lớp thành công"
          : "Cố vấn đã được gán cho lớp này rồi",
      assignment: result.rows[0] || null,
    });
  } catch (err) {
    console.error("ASSIGN ADVISOR ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// ADMIN - XEM DANH SÁCH LỚP + ADVISOR
// ==========================================
app.get("/admin/classes", verifyToken, async (req, res) => {
  try {
    if (normalizeRole(req.user.role) !== "ADMIN") {
      return res.status(403).json({ message: "Chỉ ADMIN mới được truy cập" });
    }

    const result = await pool.query(`
      SELECT
        c.code AS class_code,
        c.name AS class_name,
        c.cohort,
        c.program,
        u.id AS advisor_id,
        u.email AS advisor_email,
        u.full_name AS advisor_name
      FROM admin_classes c
      LEFT JOIN advisor_class ac ON ac.class_code = c.code
      LEFT JOIN users u ON u.id = ac.advisor_id
      ORDER BY c.code ASC
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error("GET ADMIN CLASSES ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// CHI TIẾT 1 SINH VIÊN
// ==========================================
app.get("/students/:id", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const studentResult = await client.query(
      `
      SELECT
        s.id,
        s.mssv,
        s.full_name,
        c.code AS class_code,
        c.cohort
      FROM students s
      LEFT JOIN admin_classes c ON c.code = s.class_code
      WHERE s.id = $1
      `,
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const student = studentResult.rows[0];

    const coursesResult = await client.query(
      `
      SELECT
        e.id AS enrollment_id,
        e.semester,
        co.code AS course_code,
        co.name AS course_name,
        co.credits,
        g.letter_grade AS letter,
        g.gpa_points
      FROM enrollments e
      JOIN courses co ON co.id = e.course_id
      LEFT JOIN grades g ON g.enrollment_id = e.id
      WHERE e.student_id = $1
      ORDER BY e.semester ASC, co.code ASC
      `,
      [id]
    );

    const courses = coursesResult.rows;

    let totalCredits = 0;
    let totalWeightedGpa = 0;
    let hasF = false;

    for (const c of courses) {
      const credits = Number(c.credits || 0);
      const gpaPoints = Number(c.gpa_points || 0);

      totalCredits += credits;
      totalWeightedGpa += gpaPoints * credits;

      if (c.letter === "F") hasF = true;
    }

    const gpa =
      totalCredits > 0
        ? Number((totalWeightedGpa / totalCredits).toFixed(2))
        : 0;

    const warnings = [];
    if (gpa < 2.0) warnings.push("GPA thấp");
    if (hasF) warnings.push("Có môn rớt");

    return res.json({
      student,
      gpa,
      warnings,
      courses,
    });
  } catch (err) {
    console.error("GET STUDENT DETAIL ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  } finally {
    client.release();
  }
});

// ==========================================
// CHI TIẾT 1 LỚP
// ==========================================
app.get("/classes/:code", verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { code } = req.params;

    const classResult = await client.query(
      `
      SELECT
        c.code,
        c.name,
        c.cohort,
        c.program,
        u.full_name AS advisor_name,
        u.email AS advisor_email
      FROM admin_classes c
      LEFT JOIN advisor_class ac ON ac.class_code = c.code
      LEFT JOIN users u ON u.id = ac.advisor_id
      WHERE c.code = $1
      `,
      [code]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lớp" });
    }

    const classInfo = classResult.rows[0];

    const studentsResult = await client.query(
      `
      SELECT
        s.id,
        s.mssv,
        s.full_name,
        COALESCE(
          ROUND(
            SUM(g.gpa_points * co.credits::numeric) / NULLIF(SUM(co.credits), 0)
          , 2), 0
        ) AS gpa,
        COUNT(CASE WHEN g.letter_grade = 'F' THEN 1 END)::int AS fail_count
      FROM students s
      LEFT JOIN enrollments e ON e.student_id = s.id
      LEFT JOIN grades g ON g.enrollment_id = e.id
      LEFT JOIN courses co ON co.id = e.course_id
      WHERE s.class_code = $1
      GROUP BY s.id, s.mssv, s.full_name
      ORDER BY s.full_name ASC
      `,
      [code]
    );

    return res.json({
      classInfo,
      students: studentsResult.rows,
    });
  } catch (err) {
    console.error("GET CLASS DETAIL ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  } finally {
    client.release();
  }
});

// ==========================================
// GLOBAL SEARCH
// ==========================================
app.get("/api/search", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.json([]);
    }

    const searchPattern = `%${q}%`;

    const result = await pool.query(
      `
      SELECT id, mssv AS code, full_name AS name, 'student' AS type
      FROM students
      WHERE mssv ILIKE $1 OR full_name ILIKE $1

      UNION ALL

      SELECT NULL::int AS id, code, cohort AS name, 'class' AS type
      FROM admin_classes
      WHERE code ILIKE $1 OR cohort ILIKE $1

      LIMIT 10
      `,
      [searchPattern]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// ==========================================
// CONVERSATIONS
// ==========================================
app.get("/conversations", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "ADVISOR" && normalizeRole(req.user.role) !== "ADMIN") {
      return res.status(403).json({ message: "Chỉ cố vấn mới được xem danh sách hội thoại" });
    }

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.student_id,
        s.full_name AS name,
        s.mssv AS "idNumber",
        s.class_code AS "classCode",
        latest.content AS "lastMessage",
        TO_CHAR(latest.created_at, 'HH24:MI') AS time,
        latest.created_at AS "lastMessageAt",
        COALESCE(unread.unread_count, 0)::int AS "unreadCount",
        (COALESCE(unread.unread_count, 0) > 0) AS "isUnread",
        su.id AS student_user_id,
        COALESCE(pref.muted, FALSE) AS muted
      FROM conversations c
      JOIN students s ON s.id = c.student_id
      LEFT JOIN users su ON su.student_id = c.student_id
      LEFT JOIN message_notif_prefs pref
        ON pref.user_id = c.advisor_id AND pref.peer_user_id = su.id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unread_count
        FROM messages
        WHERE conversation_id = c.id
          AND sender_role = 'STUDENT'
          AND COALESCE(is_read, FALSE) = FALSE
      ) unread ON true
      WHERE c.advisor_id = $1
      ORDER BY latest.created_at DESC NULLS LAST, c.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách hội thoại:", err);
    res.status(500).json({
      message: "Lỗi lấy danh sách chat",
      detail: err.message,
    });
  }
});

app.get("/conversations/unread", verifyToken, async (req, res) => {
  try {
    const role = normalizeRole(req.user.role);
    const unreadSenderRole = getMessageUnreadSenderRole(role);

    if (role === "STUDENT") {
      const result = await pool.query(
        `
        SELECT
          c.id AS conversation_id,
          c.advisor_id,
          advisor.full_name AS sender_name,
          advisor.email AS sender_detail,
          latest.content AS last_message,
          latest.created_at AS last_message_at,
          COALESCE(unread.unread_count, 0)::int AS unread_count
        FROM conversations c
        JOIN users student_user ON student_user.student_id = c.student_id
        LEFT JOIN users advisor ON advisor.id = c.advisor_id
        JOIN LATERAL (
          SELECT content, created_at
          FROM messages
          WHERE conversation_id = c.id
            AND sender_role = $2
            AND COALESCE(is_read, FALSE) = FALSE
          ORDER BY created_at DESC
          LIMIT 1
        ) latest ON true
        JOIN LATERAL (
          SELECT COUNT(*) AS unread_count
          FROM messages
          WHERE conversation_id = c.id
            AND sender_role = $2
            AND COALESCE(is_read, FALSE) = FALSE
        ) unread ON true
        WHERE student_user.id = $1
        ORDER BY latest.created_at DESC
        `,
        [req.user.id, unreadSenderRole]
      );

      // Gộp thêm tin chưa đọc từ các hội thoại sinh viên ↔ sinh viên (dm_threads).
      const dmResult = await pool.query(
        `
        SELECT
          'peer:' || t.id AS conversation_id,
          COALESCE(ps.full_name, peer.full_name) AS sender_name,
          ps.mssv AS sender_detail,
          latest.content AS last_message,
          latest.created_at AS last_message_at,
          unread.unread_count::int AS unread_count
        FROM dm_threads t
        JOIN users peer
          ON peer.id = CASE WHEN t.user_a_id = $1 THEN t.user_b_id ELSE t.user_a_id END
        LEFT JOIN students ps ON ps.id = peer.student_id
        JOIN LATERAL (
          SELECT content, created_at FROM dm_messages
          WHERE thread_id = t.id AND sender_id <> $1 AND read_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        ) latest ON TRUE
        JOIN LATERAL (
          SELECT COUNT(*) AS unread_count FROM dm_messages
          WHERE thread_id = t.id AND sender_id <> $1 AND read_at IS NULL
        ) unread ON TRUE
        WHERE (t.user_a_id = $1 OR t.user_b_id = $1)
          AND unread.unread_count > 0
        ORDER BY latest.created_at DESC
        `,
        [req.user.id]
      );

      const items = [...result.rows, ...dmResult.rows];
      const total = items.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);
      return res.json({ total, items });
    }

    if (role !== "ADVISOR" && role !== "ADMIN") {
      return res.status(403).json({ message: "Bạn không có quyền xem thông báo tin nhắn." });
    }

    const result = await pool.query(
      `
      SELECT
        c.id AS conversation_id,
        c.student_id,
        s.full_name AS sender_name,
        s.mssv AS sender_detail,
        latest.content AS last_message,
        latest.created_at AS last_message_at,
        COALESCE(unread.unread_count, 0)::int AS unread_count
      FROM conversations c
      JOIN students s ON s.id = c.student_id
      JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
          AND sender_role = $2
          AND COALESCE(is_read, FALSE) = FALSE
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
      JOIN LATERAL (
        SELECT COUNT(*) AS unread_count
        FROM messages
        WHERE conversation_id = c.id
          AND sender_role = $2
          AND COALESCE(is_read, FALSE) = FALSE
      ) unread ON true
      WHERE c.advisor_id = $1
      ORDER BY latest.created_at DESC
      `,
      [req.user.id, unreadSenderRole]
    );

    const total = result.rows.reduce((sum, row) => sum + Number(row.unread_count || 0), 0);
    return res.json({ total, items: result.rows });
  } catch (err) {
    console.error("Lỗi lấy thông báo tin nhắn:", err.message);
    return res.status(500).json({ message: "Lỗi lấy thông báo tin nhắn" });
  }
});
app.get("/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.id, req.user);

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền xem hội thoại này" });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy tin nhắn:", err.message);
    res.status(500).json({ message: "Lỗi lấy tin nhắn" });
  }
});

app.patch("/conversations/:id/read", verifyToken, async (req, res) => {
  try {
    const conversation = await getConversationForUser(req.params.id, req.user);

    if (!conversation) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật hội thoại này" });
    }

    const readerRole = getMessageReaderRole(req.user.role);
    const result = await pool.query(
      `
      UPDATE messages
      SET is_read = TRUE
      WHERE conversation_id = $1
        AND sender_role <> $2
        AND COALESCE(is_read, FALSE) = FALSE
      RETURNING id
      `,
      [req.params.id, readerRole]
    );

    const readMessageIds = result.rows.map((row) => row.id);

    if (readMessageIds.length > 0) {
      io.to(`conv_${req.params.id}`).emit("messages_read", {
        conversationId: Number(req.params.id),
        readerRole,
        messageIds: readMessageIds,
      });

      // Đồng thời báo qua phòng user_<id> (UI sinh viên mới nghe ở đây) để cập
      // nhật tick "đã đọc" realtime, không phải reload.
      const parts = await getConversationParticipantUserIds(req.params.id);
      if (parts) {
        emitMessageRead(io, {
          key: `advisor:${Number(req.params.id)}`,
          readerId: Number(req.user.id),
          messageIds: readMessageIds.map(Number),
          userIds: [parts.advisorUserId, parts.studentUserId],
        });
      }
    }

    return res.json({
      conversation_id: Number(req.params.id),
      reader_role: readerRole,
      read_message_ids: readMessageIds,
    });
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái đã đọc:", err.message);
    return res.status(500).json({ message: "Lỗi cập nhật trạng thái đã đọc" });
  }
});

app.post("/conversations", verifyToken, async (req, res) => {
  try {
    const studentId = Number(req.body?.student_id);
    const role = normalizeRole(req.user.role);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ message: "Thiếu student_id hợp lệ" });
    }

    if (role !== "ADVISOR" && role !== "ADMIN") {
      return res.status(403).json({ message: "Chỉ cố vấn mới được tạo hội thoại với sinh viên." });
    }

    if (role === "ADVISOR") {
      const allowed = await canAdvisorAccessStudent(req.user.id, studentId);
      if (!allowed) {
        return res.status(403).json({ message: "Bạn chỉ được nhắn tin với sinh viên thuộc lớp mình phụ trách." });
      }
    }

    const insertResult = await pool.query(
      `
      INSERT INTO conversations (advisor_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT (advisor_id, student_id) DO UPDATE
        SET advisor_id = EXCLUDED.advisor_id
      RETURNING id
      `,
      [req.user.id, studentId]
    );

    const conversationId = insertResult.rows[0].id;
    const detailResult = await pool.query(
      `
      SELECT
        c.id,
        c.student_id,
        s.full_name AS name,
        s.mssv AS "idNumber",
        s.class_code AS "classCode",
        latest.content AS "lastMessage",
        TO_CHAR(latest.created_at, 'HH24:MI') AS time,
        latest.created_at AS "lastMessageAt",
        COALESCE(unread.unread_count, 0)::int AS "unreadCount",
        (COALESCE(unread.unread_count, 0) > 0) AS "isUnread",
        su.id AS student_user_id,
        COALESCE(pref.muted, FALSE) AS muted
      FROM conversations c
      JOIN students s ON s.id = c.student_id
      LEFT JOIN users su ON su.student_id = c.student_id
      LEFT JOIN message_notif_prefs pref
        ON pref.user_id = c.advisor_id AND pref.peer_user_id = su.id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unread_count
        FROM messages
        WHERE conversation_id = c.id
          AND sender_role = 'STUDENT'
          AND COALESCE(is_read, FALSE) = FALSE
      ) unread ON true
      WHERE c.id = $1
      LIMIT 1
      `,
      [conversationId]
    );

    return res.json(detailResult.rows[0] || { id: conversationId, student_id: studentId });
  } catch (err) {
    console.error("Lỗi tạo cuộc hội thoại:", err.message);
    return res.status(500).json({ message: "Lỗi tạo cuộc hội thoại" });
  }
});
// ==========================================
// GRACEFUL SHUTDOWN (Giải quyết triệt để EADDRINUSE trên Windows)
// ==========================================
const closeServer = (signal) => {
  console.log(`\n[Server] Nhận được tín hiệu ${signal}. Đang giải phóng port...`);
  httpServer.close(() => {
    console.log('[Server] Đã giải phóng port thành công.');
    process.exit(0);
  });
};

// Xử lý riêng cho nodemon restart
process.once('SIGUSR2', () => {
  httpServer.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => closeServer('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => closeServer('SIGTERM'));

// Bắt lỗi không xác định để tránh treo process
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  closeServer('uncaughtException');
});

// ==========================================
// START SERVER
// ==========================================
import { config } from './config.js';
const PORT = config.port || Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("DB connected:", result.rows[0]);
    await ensureUserProfileColumns();
    await ensureMessagingSchema();
    await ensurePasswordResetSchema();

    httpServer.listen(PORT, () => {
      console.log(`Backend & Socket.io running on port ${PORT}`);
    });
  } catch (err) {
    console.error("DB startup error:", err.message);
    process.exit(1);
  }
};

startServer();
