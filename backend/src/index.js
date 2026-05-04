console.log("Running from:", import.meta.url);
import advisorRouter from './routes/advisorRoutes.js';
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { verifyToken } from './middleware/auth.js';

// THÊM 2 DÒNG NÀY ĐỂ SETUP SOCKET.IO
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'uit_advisorhub_secret_2026';

app.use(cors());
app.use(express.json());

// ==========================================
// CẤU HÌNH SOCKET.IO CHO TÍNH NĂNG NHẮN TIN
// ==========================================
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Đảm bảo đúng port Frontend của bạn
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Một client đã kết nối:', socket.id);

  // Khi client tham gia một cuộc hội thoại (room) cụ thể
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Khi có người gửi tin nhắn
  socket.on('send_message', async (data) => {
    const { conversationId, senderId, senderRole, content } = data;
    try {
      // Lưu tin nhắn vào Database
      const result = await pool.query(`
        INSERT INTO messages (conversation_id, sender_role, sender_id, content)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [conversationId, senderRole, senderId, content]);

      const newMessage = result.rows[0];

      // Phát (broadcast) tin nhắn mới tới tất cả những người đang mở khung chat này
      io.to(`conv_${conversationId}`).emit('new_message', newMessage);
    } catch (err) {
      console.error('Lỗi khi lưu/gửi tin nhắn:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client ngắt kết nối:', socket.id);
  });
});

// ==========================================
// CÁC ROUTE CỦA HỆ THỐNG
// ==========================================

// BẢO VỆ ROUTE ADVISOR: Yêu cầu phải có token hợp lệ mới được truy cập
app.use('/advisor', verifyToken, advisorRouter); 

pool.query("SELECT NOW()")
    .then((res) => {
      console.log("DB connected:", res.rows[0]);
    })
    .catch((err) => {
      console.error("DB connection error:", err.message);
    });

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * LOGIN
 * Đã tích hợp JWT trả về token cho Client
 */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const result = await pool.query(
        `SELECT id, email, password_hash, role
         FROM users
         WHERE email = $1`,
        [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email không tồn tại" });
    }

    const user = result.rows[0];

    // TODO: Chuyển sang dùng bcrypt để kiểm tra mật khẩu đã hash trong CSDL
    // const isValid = await bcrypt.compare(password, user.password_hash);
    const isValid = (password === user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    // TẠO TOKEN: Lưu id, email, role vào token, thời hạn 8 tiếng
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token: token, // Trả về token cho Client
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * ADMIN - TẠO ADVISOR
 */
app.post("/admin/advisors", async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // TODO: Hash password bằng bcrypt trước khi lưu
    // const salt = await bcrypt.genSalt(10);
    // const hashedPw = await bcrypt.hash(password, salt);
    
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, role)
           VALUES ($1, $2, 'ADVISOR')
             RETURNING id, email, role, created_at`,
        [email, password] // Đổi thành hashedPw khi đã áp dụng bcrypt
    );

    return res.status(201).json({
      message: "Tạo advisor thành công",
      advisor: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE ADVISOR ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * ADMIN - TẠO CLASS
 */
app.post("/admin/classes", async (req, res) => {
  try {
    const { code, cohort } = req.body;

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
        `INSERT INTO admin_classes (code, cohort)
           VALUES ($1, $2)
             RETURNING *`,
        [code, cohort || null]
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

/**
 * ADMIN - GÁN ADVISOR CHO LỚP
 */
app.post("/admin/assign-advisor", async (req, res) => {
  try {
    const { advisor_user_id, class_id } = req.body;

    if (!advisor_user_id || !class_id) {
      return res.status(400).json({ message: "Thiếu advisor_user_id hoặc class_id" });
    }

    const advisorCheck = await pool.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [advisor_user_id]
    );

    if (advisorCheck.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy advisor" });
    }

    if (advisorCheck.rows[0].role !== "ADVISOR") {
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
        `INSERT INTO advisor_class (advisor_id, class_code)
         VALUES ($1, $2)
         ON CONFLICT (advisor_id, class_code) DO NOTHING
       RETURNING *`,
        [advisor_user_id, class_id]
    );

    return res.json({
      message:
          result.rows.length > 0
              ? "Gán advisor cho lớp thành công"
              : "Advisor đã được gán cho lớp này rồi",
      assignment: result.rows[0] || null,
    });
  } catch (err) {
    console.error("ASSIGN ADVISOR ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * ADMIN - XEM DANH SÁCH LỚP + ADVISOR
 */
app.get("/admin/classes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.code AS class_code,
        c.name AS class_name,
        c.cohort,
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

/**
 * CHI TIẾT 1 SINH VIÊN
 */
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
        totalCredits > 0 ? Number((totalWeightedGpa / totalCredits).toFixed(2)) : 0;

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

/**
 * CHI TIẾT 1 LỚP + DANH SÁCH SINH VIÊN KÈM GPA
 */
app.get("/classes/:code", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { code } = req.params;

    const classResult = await client.query(
        `SELECT c.code, c.name, c.cohort, c.program,
               u.full_name AS advisor_name, u.email AS advisor_email
        FROM admin_classes c
        LEFT JOIN advisor_class ac ON ac.class_code = c.code
        LEFT JOIN users u ON u.id = ac.advisor_id
        WHERE c.code = $1`,
        [code]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lớp" });
    }

    const classInfo = classResult.rows[0];

    const studentsResult = await client.query(
        `SELECT
         s.id, s.mssv, s.full_name,
         COALESCE(
           ROUND(
             SUM(g.gpa_points * co.credits::numeric) / NULLIF(SUM(co.credits), 0)
           , 2), 0
         ) AS gpa,
         COUNT(CASE WHEN g.letter_grade = 'F' THEN 1 END)::int AS fail_count
        FROM students s
        LEFT JOIN enrollments e  ON e.student_id = s.id
        LEFT JOIN grades g       ON g.enrollment_id = e.id
        LEFT JOIN courses co     ON co.id = e.course_id
        WHERE s.class_code = $1
        GROUP BY s.id, s.mssv, s.full_name
        ORDER BY s.full_name ASC`,
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

/**
 * GLOBAL SEARCH (Sinh viên & Lớp học)
 */
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
// CÁC API MỚI CHO TÍNH NĂNG NHẮN TIN
// ==========================================

/**
 * Lấy danh sách các cuộc hội thoại của Cố vấn hiện tại
 */
app.get('/conversations', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.student_id, s.full_name AS name, s.mssv AS idNumber,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS lastMessage,
        (SELECT TO_CHAR(created_at, 'HH24:MI') FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS time
      FROM conversations c
      JOIN students s ON s.id = c.student_id
      WHERE c.advisor_id = $1
      ORDER BY c.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy danh sách hội thoại:", err.message);
    res.status(500).json({ message: 'Lỗi lấy danh sách chat' });
  }
});

/**
 * Lấy lịch sử tin nhắn của một cuộc hội thoại cụ thể
 */
app.get('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi lấy tin nhắn:", err.message);
    res.status(500).json({ message: 'Lỗi lấy tin nhắn' });
  }
});

/**
 * Khởi tạo cuộc hội thoại mới (nếu chưa có)
 */
app.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { student_id } = req.body;
    
    // Kiểm tra xem đã có conversation giữa advisor này và student này chưa
    const result = await pool.query(`
  INSERT INTO conversations (advisor_id, student_id)
  VALUES ($1, $2)
  ON CONFLICT (advisor_id, student_id) DO UPDATE
    SET advisor_id = EXCLUDED.advisor_id
  RETURNING id
`, [req.user.id, student_id]);

res.json(result.rows[0]);
  } catch (err) {
    console.error("Lỗi tạo cuộc hội thoại:", err.message);
    res.status(500).json({ message: 'Lỗi tạo cuộc hội thoại' });
  }
});

// !!! QUAN TRỌNG: Dùng httpServer.listen thay vì app.listen !!!
httpServer.listen(4000, () => {
  console.log("Backend & Socket.io running on http://localhost:4000");
});