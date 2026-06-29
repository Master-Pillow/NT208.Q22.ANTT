import express from 'express';
import { pool } from '../db.js';
import { ensureStudentGradeImportSchema } from '../services/studentGradeImportService.js';
import { getStudentMetricsForUser } from '../services/studentMetricsService.js';
import {
  getStudentTimetable,
  getStudentExams,
} from '../services/studentScheduleImportService.js';

const router = express.Router();

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function isStudentRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'STUDENT' || normalized === 'SINHVIEN' || normalized === 'SINH_VIEN';
}

async function requireStudent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  // Ưu tiên kiểm tra role trong JWT, nhưng vẫn kiểm tra lại DB để tránh lỗi token cũ/localStorage lệch user.
  if (isStudentRole(req.user.role)) {
    req.user.role = 'STUDENT';
    return next();
  }

  try {
    const userResult = await pool.query(
      `SELECT id, role, student_id FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );

    const dbUser = userResult.rows[0];

    if (dbUser && isStudentRole(dbUser.role)) {
      req.user.role = 'STUDENT';
      req.user.student_id = dbUser.student_id;
      return next();
    }

    return res.status(403).json({
      message: 'Chỉ sinh viên mới được truy cập',
      detail: 'Token hiện tại không thuộc tài khoản sinh viên. Hãy đăng xuất, xóa localStorage và đăng nhập lại bằng tài khoản sinh viên.',
    });
  } catch (err) {
    console.error('[requireStudent]', err);
    return res.status(500).json({
      message: 'Lỗi kiểm tra quyền sinh viên',
      detail: err.message,
    });
  }
}

// GET /student/me
router.get('/me', requireStudent, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.email,
        u.full_name AS user_full_name,
        u.role,
        s.id AS student_id,
        s.full_name,
        s.mssv,
        s.class_code,
        s.cohort
      FROM users u
      JOIN students s ON s.id = u.student_id
      WHERE u.id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[student/me]', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

// GET /student/academic
router.get('/academic', requireStudent, async (req, res) => {
  try {
    await ensureStudentGradeImportSchema();

    const summaryResult = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.mssv,
        s.class_code,
        s.cohort,
        ROUND(COALESCE(AVG(g.gpa_points), 0)::numeric, 2) AS current_gpa,
        COALESCE(SUM(CASE WHEN g.letter_grade = 'F' THEN c.credits ELSE 0 END), 0) AS credit_debt,
        COUNT(e.id) AS total_courses,
        COALESCE(SUM(c.credits), 0) AS total_credits,
        COUNT(CASE WHEN g.letter_grade = 'F' THEN 1 END) AS failed_courses
      FROM users u
      JOIN students s ON s.id = u.student_id
      LEFT JOIN enrollments e ON e.student_id = s.id
      LEFT JOIN courses c ON c.id = e.course_id
      LEFT JOIN grades g ON g.enrollment_id = e.id
      WHERE u.id = $1
      GROUP BY s.id
      `,
      [req.user.id]
    );

    const coursesResult = await pool.query(
      `
      SELECT
        c.code,
        c.name,
        c.credits,
        e.semester,
        g.letter_grade,
        g.numeric_grade,
        g.gpa_points,
        COALESCE(g.status, 'GRADED') AS status
      FROM users u
      JOIN students s ON s.id = u.student_id
      JOIN enrollments e ON e.student_id = s.id
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN grades g ON g.enrollment_id = e.id
      WHERE u.id = $1
      ORDER BY e.semester DESC, c.code ASC
      `,
      [req.user.id]
    );

    res.json({
      summary: summaryResult.rows[0],
      courses: coursesResult.rows,
    });
  } catch (err) {
    console.error('[student/academic]', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

// GET /student/metrics
router.get('/metrics', requireStudent, async (req, res) => {
  try {
    const metrics = await getStudentMetricsForUser(req.user.id);
    return res.json(metrics);
  } catch (err) {
    console.error('[student/metrics]', err);
    return res.status(500).json({
      message: 'Không thể tính xu hướng điểm học tập.',
      detail: err.message,
    });
  }
});

async function resolveStudentId(userId) {
  const result = await pool.query(
    `SELECT student_id FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.student_id || null;
}

// GET /student/schedule?semester=HK2-2025  (thời khoá biểu)
router.get('/schedule', requireStudent, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    }
    const semester = req.query.semester ? String(req.query.semester) : null;
    const entries = await getStudentTimetable(studentId, semester);
    const semesters = [...new Set(entries.map((e) => e.semester))];
    res.json({ semester: semester || semesters[0] || null, semesters, entries });
  } catch (err) {
    console.error('[student/schedule]', err);
    res.status(500).json({ message: 'Lỗi server', detail: err.message });
  }
});

// GET /student/exams?semester=HK2-2025  (lịch thi)
router.get('/exams', requireStudent, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    if (!studentId) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    }
    const semester = req.query.semester ? String(req.query.semester) : null;
    const entries = await getStudentExams(studentId, semester);
    const semesters = [...new Set(entries.map((e) => e.semester))];
    res.json({ semester: semester || semesters[0] || null, semesters, entries });
  } catch (err) {
    console.error('[student/exams]', err);
    res.status(500).json({ message: 'Lỗi server', detail: err.message });
  }
});

// GET /student/notifications
router.get('/notifications', requireStudent, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, title, content, type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[student/notifications]', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

// GET /student/appointments
router.get('/appointments', requireStudent, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.id,
        COALESCE(a.title, 'Lịch tư vấn') AS title,
        COALESCE(a.note, '') AS description,
        a.start_time,
        a.end_time,
        COALESCE(a.status, 'PENDING') AS status,
        advisor.full_name AS advisor_name,
        advisor.email AS advisor_email
      FROM appointments a
      JOIN users student_user ON student_user.student_id = a.student_id
      LEFT JOIN users advisor ON advisor.id = a.advisor_id
      WHERE student_user.id = $1
      ORDER BY a.start_time DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[student/appointments] SQL ERROR:', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

// POST /student/appointments
router.post('/appointments', requireStudent, async (req, res) => {
  try {
    const { title, description, start_time, end_time } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ message: 'Thiếu thông tin lịch hẹn' });
    }

    const studentResult = await pool.query(
      `
      SELECT s.id AS student_id, ac.advisor_id
      FROM users u
      JOIN students s ON s.id = u.student_id
      JOIN advisor_class ac ON ac.class_code = s.class_code
      WHERE u.id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy cố vấn của sinh viên' });
    }

    const { student_id, advisor_id } = studentResult.rows[0];
    const note = description?.trim() || null;

    const insertResult = await pool.query(
      `
      INSERT INTO appointments (
        advisor_id,
        student_id,
        title,
        start_time,
        end_time,
        status,
        note,
        type
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, 'MEETING')
      RETURNING *
      `,
      [advisor_id, student_id, title.trim(), start_time, end_time, note]
    );

    const appointment = insertResult.rows[0];

    const notifyResult = await pool.query(
      `
      INSERT INTO notifications (user_id, title, content, type)
      SELECT
        $1,
        'Yêu cầu đặt lịch tư vấn mới',
        s.full_name || ' (' || s.mssv || ') muốn đặt lịch: ' || $2,
        'APPOINTMENT'
      FROM students s
      WHERE s.id = $3
      RETURNING *
      `,
      [advisor_id, title.trim(), student_id]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${advisor_id}`).emit('appointment_request_created', {
        ...appointment,
        notification: notifyResult.rows[0] || null,
      });
    }

    res.status(201).json(appointment);
  } catch (err) {
    console.error('[student/create appointment] SQL ERROR:', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

// GET /student/messages
router.get('/messages', requireStudent, async (req, res) => {
  try {
    const conversationResult = await pool.query(
      `
      SELECT
        c.id,
        advisor.full_name AS advisor_name,
        advisor.email AS advisor_email,
        COALESCE(unread.unread_count, 0)::int AS unread_count,
        (COALESCE(unread.unread_count, 0) > 0) AS is_unread
      FROM conversations c
      JOIN users advisor ON advisor.id = c.advisor_id
      JOIN users student_user ON student_user.student_id = c.student_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unread_count
        FROM messages
        WHERE conversation_id = c.id
          AND sender_role = 'ADVISOR'
          AND COALESCE(is_read, FALSE) = FALSE
      ) unread ON true
      WHERE student_user.id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (conversationResult.rows.length === 0) {
      return res.json({
        conversation: null,
        messages: [],
      });
    }

    const conversation = conversationResult.rows[0];

    const messagesResult = await pool.query(
      `
      SELECT id, conversation_id, sender_role, sender_id, content, created_at, is_read
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      `,
      [conversation.id]
    );

    res.json({
      conversation,
      messages: messagesResult.rows,
    });
  } catch (err) {
    console.error('[student/messages]', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

// POST /student/messages
router.post('/messages', requireStudent, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Tin nhắn không được để trống' });
    }

    let conversationResult = await pool.query(
      `
      SELECT c.id
      FROM conversations c
      JOIN users student_user ON student_user.student_id = c.student_id
      WHERE student_user.id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (conversationResult.rows.length === 0) {
      const advisorResult = await pool.query(
        `
        SELECT s.id AS student_id, ac.advisor_id
        FROM users u
        JOIN students s ON s.id = u.student_id
        JOIN advisor_class ac ON ac.class_code = s.class_code
        WHERE u.id = $1
        LIMIT 1
        `,
        [req.user.id]
      );

      if (advisorResult.rows.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy cố vấn để tạo hội thoại' });
      }

      const { student_id, advisor_id } = advisorResult.rows[0];

      conversationResult = await pool.query(
        `
        INSERT INTO conversations (advisor_id, student_id)
        VALUES ($1, $2)
        ON CONFLICT (advisor_id, student_id) DO UPDATE
          SET advisor_id = EXCLUDED.advisor_id
        RETURNING id
        `,
        [advisor_id, student_id]
      );
    }

    const conversationId = conversationResult.rows[0].id;

    const insertResult = await pool.query(
      `
      INSERT INTO messages (conversation_id, sender_role, sender_id, content)
      VALUES ($1, 'STUDENT', $2, $3)
      RETURNING *
      `,
      [conversationId, req.user.id, content.trim()]
    );

    const newMessage = insertResult.rows[0];
    const io = req.app.get('io');

    if (io) {
      io.to(`conv_${conversationId}`).emit('new_message', newMessage);
    }

    res.status(201).json(newMessage);
    
  } catch (err) {
    console.error('[student/send message]', err);
    res.status(500).json({
      message: 'Lỗi server',
      detail: err.message,
    });
  }
});

export default router;
