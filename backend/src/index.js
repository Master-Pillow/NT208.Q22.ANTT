console.log("Running from:", import.meta.url); // restarted2

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

import { pool } from "./db.js";
import { verifyToken } from "./middleware/auth.js";

import advisorRouter from "./routes/Advisorroutes.js";
import appointmentRouter from "./routes/appointmentRoutes.js";
import studentRouter from "./routes/studentRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import aiAnomalyRouter from "./routes/aiAnomalyRoutes.js";
import aiQueryRouter from "./routes/aiQueryRoutes.js";
import uitFaqRouter from "./routes/uitFaqRoutes.js";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "uit_advisorhub_secret_2026";

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

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
    } catch (err) {
      console.error("Lỗi khi lưu/gửi tin nhắn:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client ngắt kết nối:", socket.id);
  });
});

// ==========================================
// DATABASE CHECK
// ==========================================
pool
  .query("SELECT NOW()")
  .then((res) => {
    console.log("DB connected:", res.rows[0]);
  })
  .catch((err) => {
    console.error("DB connection error:", err.message);
  });

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
// UPDATE PROFILE
// ==========================================
app.put("/auth/profile", verifyToken, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const { bio } = req.body;
    let avatarUrl = undefined;
    let coverUrl = undefined;

    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        avatarUrl = "/uploads/" + req.files.avatar[0].filename;
      }
      if (req.files.cover && req.files.cover[0]) {
        coverUrl = "/uploads/" + req.files.cover[0].filename;
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
app.use("/admin", verifyToken, adminRouter);
app.use("/ai", verifyToken, aiQueryRouter);
app.use("/ai", verifyToken, aiAnomalyRouter);

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
        s.mssv AS idNumber,
        latest.content AS lastMessage,
        TO_CHAR(latest.created_at, 'HH24:MI') AS time,
        latest.created_at AS lastMessageAt
      FROM conversations c
      JOIN students s ON s.id = c.student_id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
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

app.get("/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
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

app.post("/conversations", verifyToken, async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ message: "Thiếu student_id" });
    }

    const result = await pool.query(
      `
      INSERT INTO conversations (advisor_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT (advisor_id, student_id) DO UPDATE
        SET advisor_id = EXCLUDED.advisor_id
      RETURNING id
      `,
      [req.user.id, student_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Lỗi tạo cuộc hội thoại:", err.message);
    res.status(500).json({ message: "Lỗi tạo cuộc hội thoại" });
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
httpServer.listen(PORT, () => {
  console.log(`Backend & Socket.io running on port ${PORT}`);
});
