// routes/adminRoutes.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// ── Middleware: chỉ ADMIN ─────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ admin mới được truy cập.' });
  }
  next();
};

router.use(requireAdmin);

// ═══════════════════════════════════════════════════════════════════
// 1. OVERVIEW
// GET /admin/overview
// ═══════════════════════════════════════════════════════════════════
router.get('/overview', async (req, res) => {
  try {
    const [advisorCount, classCount, studentCount, atRiskCount, advisorStats, gpaDistribution] =
      await Promise.all([
        // Tổng số advisor
        pool.query(`SELECT COUNT(*) FROM users WHERE role = 'ADVISOR'`),

        // Tổng số lớp
        pool.query(`SELECT COUNT(*) FROM admin_classes`),

        // Tổng số sinh viên
        pool.query(`SELECT COUNT(*) FROM students`),

        // Sinh viên at-risk (GPA < 2.5 hoặc có nợ tín chỉ)
        pool.query(`
          WITH sg AS (
            SELECT e.student_id,
              ROUND(SUM(g.gpa_points * c.credits::numeric)
                FILTER (WHERE g.letter_grade != 'F')
                / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0)
              ::numeric, 2) AS gpa,
              COALESCE(SUM(c.credits) FILTER (WHERE g.letter_grade = 'F'), 0) AS debt
            FROM enrollments e
            JOIN grades g ON g.enrollment_id = e.id
            JOIN courses c ON c.id = e.course_id
            GROUP BY e.student_id
          )
          SELECT COUNT(*) FROM sg WHERE gpa < 2.5 OR debt > 0
        `),

        // Top 5 advisor cần chú ý (avg GPA sinh viên thấp nhất)
        pool.query(`
          WITH sg AS (
            SELECT e.student_id,
              ROUND(SUM(g.gpa_points * c.credits::numeric)
                FILTER (WHERE g.letter_grade != 'F')
                / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0)
              ::numeric, 2) AS gpa,
              COALESCE(SUM(c.credits) FILTER (WHERE g.letter_grade = 'F'), 0) AS debt
            FROM enrollments e
            JOIN grades g ON g.enrollment_id = e.id
            JOIN courses c ON c.id = e.course_id
            GROUP BY e.student_id
          )
          SELECT
            u.id, u.full_name, u.email,
            COUNT(DISTINCT ac.class_code)::int AS class_count,
            COUNT(DISTINCT s.id)::int          AS student_count,
            ROUND(AVG(sg.gpa)::numeric, 2)     AS avg_gpa,
            COUNT(DISTINCT s.id) FILTER (WHERE sg.gpa < 2.5 OR sg.debt > 0)::int AS at_risk_count
          FROM users u
          LEFT JOIN advisor_class ac ON ac.advisor_id = u.id
          LEFT JOIN students s ON s.class_code = ac.class_code
          LEFT JOIN sg ON sg.student_id = s.id
          WHERE u.role = 'ADVISOR'
          GROUP BY u.id, u.full_name, u.email
          ORDER BY avg_gpa ASC NULLS LAST
          LIMIT 5
        `),

        // Phân bố GPA toàn trường
        pool.query(`
          WITH sg AS (
            SELECT e.student_id,
              ROUND(SUM(g.gpa_points * c.credits::numeric)
                FILTER (WHERE g.letter_grade != 'F')
                / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0)
              ::numeric, 2) AS gpa
            FROM enrollments e
            JOIN grades g ON g.enrollment_id = e.id
            JOIN courses c ON c.id = e.course_id
            GROUP BY e.student_id
          )
          SELECT
            COUNT(*) FILTER (WHERE gpa >= 3.6)::int AS excellent,
            COUNT(*) FILTER (WHERE gpa >= 3.2 AND gpa < 3.6)::int AS good,
            COUNT(*) FILTER (WHERE gpa >= 2.5 AND gpa < 3.2)::int AS average,
            COUNT(*) FILTER (WHERE gpa < 2.5)::int AS poor,
            ROUND(AVG(gpa)::numeric, 2) AS avg_gpa
          FROM sg
        `),
      ]);

    res.json({
      totalAdvisors:  parseInt(advisorCount.rows[0].count),
      totalClasses:   parseInt(classCount.rows[0].count),
      totalStudents:  parseInt(studentCount.rows[0].count),
      atRiskStudents: parseInt(atRiskCount.rows[0].count),
      topAtRiskAdvisors: advisorStats.rows,
      gpaDistribution: gpaDistribution.rows[0],
    });
  } catch (err) {
    console.error('GET /admin/overview ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. QUẢN LÝ ADVISOR
// ═══════════════════════════════════════════════════════════════════

// GET /admin/advisors — danh sách tất cả advisor + stats
router.get('/advisors', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH sg AS (
        SELECT e.student_id,
          ROUND(SUM(g.gpa_points * c.credits::numeric)
            FILTER (WHERE g.letter_grade != 'F')
            / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0)
          ::numeric, 2) AS gpa,
          COALESCE(SUM(c.credits) FILTER (WHERE g.letter_grade = 'F'), 0) AS debt
        FROM enrollments e
        JOIN grades g ON g.enrollment_id = e.id
        JOIN courses c ON c.id = e.course_id
        GROUP BY e.student_id
      )
      SELECT
        u.id, u.full_name, u.email, u.role,
        COUNT(DISTINCT ac.class_code)::int AS class_count,
        COUNT(DISTINCT s.id)::int          AS student_count,
        ROUND(AVG(sg.gpa)::numeric, 2)     AS avg_gpa,
        COUNT(DISTINCT s.id) FILTER (WHERE sg.gpa < 2.5 OR sg.debt > 0)::int AS at_risk_count
      FROM users u
      LEFT JOIN advisor_class ac ON ac.advisor_id = u.id
      LEFT JOIN students s ON s.class_code = ac.class_code
      LEFT JOIN sg ON sg.student_id = s.id
      WHERE u.role = 'ADVISOR'
      GROUP BY u.id, u.full_name, u.email, u.role
      ORDER BY u.full_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /admin/advisors ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /admin/advisors/:id — chi tiết 1 advisor
router.get('/advisors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [advisorRes, classesRes, statsRes] = await Promise.all([
      // Thông tin advisor
      pool.query(`SELECT id, full_name, email, role FROM users WHERE id = $1`, [id]),

      // Danh sách lớp phụ trách
      pool.query(`
        SELECT
          ac.class_code AS code,
          cl.name, cl.cohort, cl.program,
          COUNT(s.id)::int AS student_count
        FROM advisor_class ac
        JOIN admin_classes cl ON cl.code = ac.class_code
        LEFT JOIN students s ON s.class_code = ac.class_code
        WHERE ac.advisor_id = $1
        GROUP BY ac.class_code, cl.name, cl.cohort, cl.program
        ORDER BY ac.class_code
      `, [id]),

      // Thống kê tổng hợp
      pool.query(`
        WITH advisor_students AS (
          SELECT s.id FROM students s
          JOIN advisor_class ac ON ac.class_code = s.class_code
          WHERE ac.advisor_id = $1
        ),
        sg AS (
          SELECT e.student_id,
            ROUND(SUM(g.gpa_points * c.credits::numeric)
              FILTER (WHERE g.letter_grade != 'F')
              / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0)
            ::numeric, 2) AS gpa,
            COALESCE(SUM(c.credits) FILTER (WHERE g.letter_grade = 'F'), 0) AS debt
          FROM enrollments e
          JOIN grades g ON g.enrollment_id = e.id
          JOIN courses c ON c.id = e.course_id
          WHERE e.student_id IN (SELECT id FROM advisor_students)
          GROUP BY e.student_id
        )
        SELECT
          COUNT(*)::int AS total_students,
          ROUND(AVG(gpa)::numeric, 2) AS avg_gpa,
          COUNT(*) FILTER (WHERE gpa < 2.5 OR debt > 0)::int AS at_risk_count,
          COUNT(*) FILTER (WHERE gpa >= 3.6)::int AS excellent_count
        FROM sg
      `, [id]),
    ]);

    if (advisorRes.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy advisor' });
    }

    res.json({
      advisor: advisorRes.rows[0],
      classes: classesRes.rows,
      stats:   statsRes.rows[0],
    });
  } catch (err) {
    console.error('GET /admin/advisors/:id ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /admin/advisors — tạo advisor mới
router.post('/advisors', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ message: 'Thiếu email, password hoặc full_name' });
  }
  try {
    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'ADVISOR')
      RETURNING id, email, full_name, role
    `, [email, password, full_name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /admin/advisors ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /admin/advisors/:id — cập nhật thông tin / vô hiệu hóa
router.patch('/advisors/:id', async (req, res) => {
  const { full_name, email, role } = req.body;
  try {
    const result = await pool.query(`
      UPDATE users
      SET
        full_name = COALESCE($1, full_name),
        email     = COALESCE($2, email),
        role      = COALESCE($3, role)
      WHERE id = $4
      RETURNING id, email, full_name, role
    `, [full_name, email, role, req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy advisor' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /admin/advisors/:id ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. PHÂN CÔNG LỚP
// ═══════════════════════════════════════════════════════════════════

// GET /admin/classes — tất cả lớp + advisor phụ trách
router.get('/classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cl.code, cl.name, cl.cohort, cl.program,
        COUNT(DISTINCT s.id)::int AS student_count,
        u.id AS advisor_id,
        u.full_name AS advisor_name,
        u.email AS advisor_email
      FROM admin_classes cl
      LEFT JOIN advisor_class ac ON ac.class_code = cl.code
      LEFT JOIN users u ON u.id = ac.advisor_id
      LEFT JOIN students s ON s.class_code = cl.code
      GROUP BY cl.code, cl.name, cl.cohort, cl.program, u.id, u.full_name, u.email
      ORDER BY cl.code ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /admin/classes ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /admin/assign — gán advisor cho lớp
router.post('/assign', async (req, res) => {
  const { advisor_id, class_code } = req.body;
  if (!advisor_id || !class_code) {
    return res.status(400).json({ message: 'Thiếu advisor_id hoặc class_code' });
  }
  try {
    await pool.query(`
      INSERT INTO advisor_class (advisor_id, class_code)
      VALUES ($1, $2)
      ON CONFLICT (advisor_id, class_code) DO NOTHING
    `, [advisor_id, class_code]);
    res.json({ message: 'Gán lớp thành công' });
  } catch (err) {
    console.error('POST /admin/assign ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /admin/assign — gỡ advisor khỏi lớp
router.delete('/assign', async (req, res) => {
  const { advisor_id, class_code } = req.body;
  if (!advisor_id || !class_code) {
    return res.status(400).json({ message: 'Thiếu advisor_id hoặc class_code' });
  }
  try {
    await pool.query(`
      DELETE FROM advisor_class WHERE advisor_id = $1 AND class_code = $2
    `, [advisor_id, class_code]);
    res.json({ message: 'Đã gỡ phân công' });
  } catch (err) {
    console.error('DELETE /admin/assign ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. ĐÁNH GIÁ ADVISOR
// ═══════════════════════════════════════════════════════════════════

// GET /admin/evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ae.*, u.full_name AS advisor_name, u.email AS advisor_email
      FROM advisor_evaluations ae
      JOIN users u ON u.id = ae.advisor_id
      ORDER BY ae.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /admin/evaluations/generate — tự động tính điểm từ DB
router.post('/evaluations/generate', async (req, res) => {
  const { semester } = req.body;
  try {
    const advisorsRes = await pool.query(`
      WITH sg AS (
        SELECT e.student_id,
          ROUND(SUM(g.gpa_points * c.credits::numeric)
            FILTER (WHERE g.letter_grade != 'F')
            / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0)
          ::numeric, 2) AS gpa,
          COALESCE(SUM(c.credits) FILTER (WHERE g.letter_grade = 'F'), 0) AS debt
        FROM enrollments e
        JOIN grades g ON g.enrollment_id = e.id
        JOIN courses c ON c.id = e.course_id
        GROUP BY e.student_id
      )
      SELECT
        u.id AS advisor_id,
        COUNT(DISTINCT s.id)::int AS total_students,
        ROUND(AVG(sg.gpa)::numeric, 2) AS avg_gpa,
        COUNT(DISTINCT s.id) FILTER (WHERE sg.gpa < 2.5 OR sg.debt > 0)::int AS at_risk_count
      FROM users u
      JOIN advisor_class ac ON ac.advisor_id = u.id
      JOIN students s ON s.class_code = ac.class_code
      LEFT JOIN sg ON sg.student_id = s.id
      WHERE u.role = 'ADVISOR'
      GROUP BY u.id
    `);

    const inserted = [];
    for (const row of advisorsRes.rows) {
      // Tính điểm: 0-10
      // avg_gpa (0-4) → 60% trọng số
      // tỷ lệ at-risk thấp → 40% trọng số
      const gpaScore = (Number(row.avg_gpa) / 4.0) * 6;
      const atRiskRate = row.total_students > 0 ? row.at_risk_count / row.total_students : 0;
      const atRiskScore = (1 - atRiskRate) * 4;
      const score = Math.round((gpaScore + atRiskScore) * 100) / 100;

      const result = await pool.query(`
        INSERT INTO advisor_evaluations
          (advisor_id, semester, avg_student_gpa, at_risk_count, total_students, score)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [row.advisor_id, semester || 'HK-AUTO', row.avg_gpa, row.at_risk_count, row.total_students, score]);

      inserted.push(result.rows[0]);
    }

    res.json({ message: `Đã tạo ${inserted.length} đánh giá`, evaluations: inserted });
  } catch (err) {
    console.error('POST /admin/evaluations/generate ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /admin/evaluations/:id/note — thêm ghi chú
router.patch('/evaluations/:id/note', async (req, res) => {
  const { note } = req.body;
  try {
    const result = await pool.query(`
      UPDATE advisor_evaluations SET note = $1 WHERE id = $2 RETURNING *
    `, [note, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. THÔNG BÁO
// ═══════════════════════════════════════════════════════════════════

// GET /admin/notifications — thông báo admin đã gửi
router.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, u.full_name AS recipient_name, u.email AS recipient_email
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      ORDER BY n.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /admin/notifications — gửi thông báo đến 1 hoặc nhiều user
router.post('/notifications', async (req, res) => {
  const { user_ids, title, content, type } = req.body;
  if (!user_ids?.length || !title) {
    return res.status(400).json({ message: 'Thiếu user_ids hoặc title' });
  }
  try {
    const inserted = [];
    for (const uid of user_ids) {
      const result = await pool.query(`
        INSERT INTO notifications (user_id, title, content, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [uid, title, content || '', type || 'INFO']);
      inserted.push(result.rows[0]);
    }
    res.status(201).json({ message: `Đã gửi ${inserted.length} thông báo`, notifications: inserted });
  } catch (err) {
    console.error('POST /admin/notifications ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;