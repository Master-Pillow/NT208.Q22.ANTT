console.log("Running from:", import.meta.url);

import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

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
 * MVP: tạm so sánh password plain text với password_hash trong DB
 * Sau này đổi sang bcrypt
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

    // MVP: password_hash đang dùng như password thường
    if (user.password_hash !== password) {
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    return res.json({
      message: "Đăng nhập thành công",
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

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'ADVISOR')
       RETURNING id, email, role, created_at`,
      [email, password]
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
      `SELECT id FROM classes WHERE code = $1`,
      [code]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Lớp đã tồn tại" });
    }

    const result = await pool.query(
      `INSERT INTO classes (code, cohort)
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
      `SELECT id FROM classes WHERE id = $1`,
      [class_id]
    );

    if (classCheck.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy lớp" });
    }

    const result = await pool.query(
      `INSERT INTO advisor_class (advisor_user_id, class_id)
       VALUES ($1, $2)
       ON CONFLICT (advisor_user_id, class_id) DO NOTHING
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
        c.id AS class_id,
        c.code AS class_code,
        c.cohort,
        u.id AS advisor_id,
        u.email AS advisor_email
      FROM classes c
      LEFT JOIN advisor_class ac ON ac.class_id = c.id
      LEFT JOIN users u ON u.id = ac.advisor_user_id
      ORDER BY c.id ASC
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error("GET ADMIN CLASSES ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * ADVISOR - XEM SINH VIÊN THUỘC CÁC LỚP MÌNH PHỤ TRÁCH
 * GET /advisor/students?advisorId=2
 */
app.get("/advisor/students", async (req, res) => {
  try {
    const { advisorId } = req.query;

    if (!advisorId) {
      return res.status(400).json({ message: "Thiếu advisorId" });
    }

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.mssv,
        s.full_name,
        s.dob,
        c.id AS class_id,
        c.code AS class_code,
        c.cohort
      FROM advisor_class ac
      JOIN classes c ON c.id = ac.class_id
      JOIN students s ON s.class_id = c.id
      WHERE ac.advisor_user_id = $1
      ORDER BY s.id ASC
      `,
      [advisorId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET ADVISOR STUDENTS ERROR:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

/**
 * CHI TIẾT 1 SINH VIÊN
 * GET /students/:id
 */
app.get("/students/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const studentResult = await client.query(
      `
      SELECT
        s.id,
        s.mssv,
        s.full_name,
        s.dob,
        c.id AS class_id,
        c.code AS class_code,
        c.cohort
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
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
        e.status,
        co.code AS course_code,
        co.name AS course_name,
        co.credits,
        g.components_json,
        g.final_score,
        g.letter,
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
    let hasRetake = false;

    for (const c of courses) {
      const credits = Number(c.credits || 0);
      const gpaPoints = Number(c.gpa_points || 0);

      totalCredits += credits;
      totalWeightedGpa += gpaPoints * credits;

      if (c.letter === "F") hasF = true;
      if (c.status === "HOC_LAI") hasRetake = true;
    }

    const gpa =
      totalCredits > 0 ? Number((totalWeightedGpa / totalCredits).toFixed(2)) : 0;

    const warnings = [];
    if (gpa < 2.0) warnings.push("GPA thấp");
    if (hasF) warnings.push("Có môn rớt");
    if (hasRetake) warnings.push("Đang học lại");

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

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});