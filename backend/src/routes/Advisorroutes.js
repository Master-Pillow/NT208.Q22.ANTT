// routes/advisorRoutes.js
import { Router } from 'express';
import { advisorCanAccessClass, getClassMetrics } from '../services/classMetricsService.js';
import { pool } from '../db.js';   // â† relative path lÃªn thÆ° má»¥c cha

const router = Router();

// GET /advisor/students?advisorId=<id>
router.get('/students', async (req, res) => {
  const advisorId = req.user.id; // âœ… Chá»‰ láº¥y ID tá»« token

  try {
    const query = `
      WITH advisor_students AS (
        SELECT s.id, s.full_name, s.mssv, 
               cl.code AS class_code, cl.cohort
        FROM students s
               JOIN admin_classes cl ON cl.code = s.class_code
               JOIN advisor_class ac ON ac.class_code = cl.code
        WHERE ac.advisor_id = $1
      ),
           student_gpa AS (
             SELECT e.student_id,
                    ROUND(
                        COALESCE(
                            SUM(g.gpa_points * c.credits::numeric) FILTER (WHERE g.letter_grade != 'F')
                          / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0),
                            0.00)::numeric, 2
                    ) AS current_gpa
             FROM enrollments e
                    JOIN grades   g ON g.enrollment_id = e.id
                    JOIN courses  c ON c.id = e.course_id
             WHERE e.student_id IN (SELECT id FROM advisor_students)
             GROUP BY e.student_id
           ),
           student_debt AS (
             SELECT e.student_id,
                    COALESCE(SUM(c.credits), 0) AS credit_debt
             FROM enrollments e
                    JOIN grades  g ON g.enrollment_id = e.id
                    JOIN courses c ON c.id = e.course_id
             WHERE e.student_id IN (SELECT id FROM advisor_students)
               AND g.letter_grade = 'F'
             GROUP BY e.student_id
           )
      SELECT
        ast.*,
        COALESCE(sg.current_gpa, 0.00) AS current_gpa,
        COALESCE(sd.credit_debt, 0)    AS credit_debt
      FROM advisor_students ast
             LEFT JOIN student_gpa  sg ON sg.student_id = ast.id
             LEFT JOIN student_debt sd ON sd.student_id = ast.id
      ORDER BY ast.class_code, ast.full_name;
    `;

    const result = await pool.query(query, [advisorId]);
    return res.json(result.rows);
  } catch (err) {
    console.error('GET /advisor/students ERROR:', err.message);
    return res.status(500).json({ message: 'Lá»—i server khi láº¥y danh sÃ¡ch sinh viÃªn.' });
  }
});

// GET /advisor/dashboard/stats?advisorId=<id>
router.get('/dashboard/stats', async (req, res) => {
  const advisorId = req.user.id;

  try {
    const gpaQuery = `
      WITH advisor_students AS (
        SELECT s.id FROM students s
                           JOIN admin_classes cl ON cl.code = s.class_code
                           JOIN advisor_class ac ON ac.class_code = cl.code
        WHERE ac.advisor_id = $1
      ),
           student_gpa AS (
             SELECT e.student_id,
                    ROUND(
                        COALESCE(
                            SUM(g.gpa_points * c.credits::numeric) FILTER (WHERE g.letter_grade != 'F')
                          / NULLIF(SUM(c.credits::numeric) FILTER (WHERE g.letter_grade != 'F'), 0),
                            0.00)::numeric, 2
                    ) AS gpa
             FROM enrollments e
                    JOIN grades  g ON g.enrollment_id = e.id
                    JOIN courses c ON c.id = e.course_id
             WHERE e.student_id IN (SELECT id FROM advisor_students)
             GROUP BY e.student_id
           )
      SELECT
        COUNT(*) FILTER (WHERE gpa >= 3.6)                AS excellent,
        COUNT(*) FILTER (WHERE gpa >= 3.2 AND gpa < 3.6)  AS good,
        COUNT(*) FILTER (WHERE gpa >= 2.5 AND gpa < 3.2)  AS average,
        COUNT(*) FILTER (WHERE gpa < 2.5)                 AS poor,
        COUNT(*)                                           AS total,
        ROUND(AVG(gpa)::numeric, 2)                       AS avg_gpa
      FROM student_gpa;
    `;

    const killerQuery = `
      WITH advisor_students AS (
        SELECT s.id FROM students s
                           JOIN admin_classes cl ON cl.code = s.class_code
                           JOIN advisor_class ac ON ac.class_code = cl.code
        WHERE ac.advisor_id = $1
      )
      SELECT
        c.code, c.name,
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE g.letter_grade = 'F')     AS fail_count,
        ROUND(COUNT(*) FILTER (WHERE g.letter_grade = 'F')::numeric / COUNT(*) * 100, 1) AS fail_rate
      FROM enrollments e
             JOIN grades  g ON g.enrollment_id = e.id
             JOIN courses c ON c.id = e.course_id
      WHERE e.student_id IN (SELECT id FROM advisor_students)
      GROUP BY c.id, c.code, c.name
      HAVING COUNT(*) >= 5
      ORDER BY fail_rate DESC
      LIMIT 5;
    `;

    const [gpaRes, killerRes] = await Promise.all([
      pool.query(gpaQuery,   [advisorId]),
      pool.query(killerQuery, [advisorId]),
    ]);

    const counts = gpaRes.rows[0];
    const total  = parseInt(counts.total) || 1;

    const performanceDistribution = [
      { name: 'Excellent', value: Math.round(parseInt(counts.excellent) / total * 100), color: '#004ac6' },
      { name: 'Good',      value: Math.round(parseInt(counts.good)      / total * 100), color: '#2563eb' },
      { name: 'Average',   value: Math.round(parseInt(counts.average)   / total * 100), color: '#93c5fd' },
      { name: 'Poor',      value: Math.round(parseInt(counts.poor)      / total * 100), color: '#ba1a1a' },
    ];

    const killerSubjects = killerRes.rows.map((row, idx) => ({
      code:      row.code,
      name:      row.name,
      failRate:  parseFloat(row.fail_rate),
      failCount: parseInt(row.fail_count),
      total:     parseInt(row.total),
      color: idx < 2 ? 'bg-error' : idx < 4 ? 'bg-orange-500' : 'bg-blue-500',
      text:  idx < 2 ? 'text-error' : idx < 4 ? 'text-orange-500' : 'text-blue-500',
    }));

    return res.json({
      performanceDistribution,
      killerSubjects,
      avgGpa:        parseFloat(counts.avg_gpa) || 0,
      totalStudents: total,
    });
  } catch (err) {
    console.error('GET /advisor/dashboard/stats ERROR:', err.message);
    return res.status(500).json({ message: 'Lá»—i server khi láº¥y thá»‘ng kÃª.' });
  }
});

// GET /advisor/classes/:code/metrics - phân tích lớp cố vấn được phân công
router.get('/classes/:code/metrics', async (req, res) => {
  try {
    const canAccess = await advisorCanAccessClass(req.user.id, req.params.code);
    if (!canAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền xem phân tích của lớp này.' });
    }

    const metrics = await getClassMetrics(req.params.code);
    return res.json(metrics);
  } catch (err) {
    console.error('GET /advisor/classes/:code/metrics ERROR:', err.message);
    return res.status(500).json({ message: 'Không thể tính phân tích lớp.' });
  }
});

export default router;
// ===============================================================
// LOG NOTES - Ghi chÃº tÆ° váº¥n CRUD
// ===============================================================

const requireAdvisor = (req, res, next) => {
  if (req.user?.role !== 'ADVISOR') {
    return res.status(403).json({ message: 'Chá»‰ advisor má»›i Ä‘Æ°á»£c truy cáº­p.' });
  }
  next();
};

const checkStudentInAdvisorScope = async (advisorId, studentId) => {
  const result = await pool.query(
      `
    SELECT s.id
    FROM students s
    JOIN advisor_class ac ON ac.class_code = s.class_code
    WHERE s.id = $1
      AND ac.advisor_id = $2
    LIMIT 1
    `,
      [studentId, advisorId]
  );

  return result.rows.length > 0;
};

// GET /advisor/log-notes
// GET /advisor/log-notes?studentId=1&q=gpa
router.get('/log-notes', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const { studentId, q } = req.query;

  try {
    const params = [advisorId];
    let where = `
      WHERE al.advisor_user_id = $1
        AND EXISTS (
          SELECT 1
          FROM advisor_class ac
          WHERE ac.advisor_id = $1
            AND ac.class_code = s.class_code
        )
    `;

    if (studentId) {
      params.push(studentId);
      where += ` AND al.student_id = $${params.length}`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      where += `
        AND (
          s.full_name ILIKE $${params.length}
          OR s.mssv ILIKE $${params.length}
          OR al.reason ILIKE $${params.length}
          OR al.action_plan ILIKE $${params.length}
          OR al.note ILIKE $${params.length}
        )
      `;
    }

    const result = await pool.query(
        `
      SELECT
        al.id,
        al.student_id,
        s.full_name AS student_name,
        s.mssv,
        s.class_code,
        al.advisor_user_id,
        u.full_name AS advisor_name,
        al.reason,
        al.action_plan,
        al.note,
        al.created_at
      FROM advising_logs al
      JOIN students s ON s.id = al.student_id
      JOIN users u ON u.id = al.advisor_user_id
      ${where}
      ORDER BY al.created_at DESC, al.id DESC
      `,
        params
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('GET /advisor/log-notes ERROR:', err.message);
    return res.status(500).json({ message: 'Lá»—i server khi láº¥y ghi chÃº tÆ° váº¥n.' });
  }
});

// POST /advisor/log-notes
router.post('/log-notes', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const { student_id, reason, action_plan, note } = req.body;

  if (!student_id) {
    return res.status(400).json({ message: 'Thiáº¿u student_id.' });
  }

  if (!reason?.trim() && !action_plan?.trim() && !note?.trim()) {
    return res.status(400).json({ message: 'Cáº§n nháº­p Ã­t nháº¥t 1 ná»™i dung ghi chÃº.' });
  }

  try {
    const inScope = await checkStudentInAdvisorScope(advisorId, student_id);

    if (!inScope) {
      return res.status(403).json({
        message: 'Báº¡n khÃ´ng cÃ³ quyá»n ghi chÃº cho sinh viÃªn nÃ y.',
      });
    }

    const result = await pool.query(
        `
      INSERT INTO advising_logs (
        student_id,
        advisor_user_id,
        reason,
        action_plan,
        note
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
        [
          student_id,
          advisorId,
          reason?.trim() || null,
          action_plan?.trim() || null,
          note?.trim() || null,
        ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /advisor/log-notes ERROR:', err.message);
    return res.status(500).json({ message: 'Lá»—i server khi táº¡o ghi chÃº tÆ° váº¥n.' });
  }
});

// PATCH /advisor/log-notes/:id
router.patch('/log-notes/:id', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const logId = req.params.id;
  const { student_id, reason, action_plan, note } = req.body;

  try {
    if (student_id) {
      const inScope = await checkStudentInAdvisorScope(advisorId, student_id);

      if (!inScope) {
        return res.status(403).json({
          message: 'Báº¡n khÃ´ng cÃ³ quyá»n chuyá»ƒn ghi chÃº sang sinh viÃªn nÃ y.',
        });
      }
    }

    const result = await pool.query(
        `
      UPDATE advising_logs al
      SET
        student_id = COALESCE($1, al.student_id),
        reason = COALESCE($2, al.reason),
        action_plan = COALESCE($3, al.action_plan),
        note = COALESCE($4, al.note)
      FROM students s
      WHERE al.id = $5
        AND al.advisor_user_id = $6
        AND s.id = al.student_id
        AND EXISTS (
          SELECT 1
          FROM advisor_class ac
          WHERE ac.advisor_id = $6
            AND ac.class_code = s.class_code
        )
      RETURNING al.*
      `,
        [
          student_id || null,
          reason !== undefined ? reason.trim() || null : null,
          action_plan !== undefined ? action_plan.trim() || null : null,
          note !== undefined ? note.trim() || null : null,
          logId,
          advisorId,
        ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y ghi chÃº tÆ° váº¥n.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /advisor/log-notes/:id ERROR:', err.message);
    return res.status(500).json({ message: 'Lá»—i server khi cáº­p nháº­t ghi chÃº tÆ° váº¥n.' });
  }
});

// DELETE /advisor/log-notes/:id
router.delete('/log-notes/:id', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const logId = req.params.id;

  try {
    const result = await pool.query(
        `
      DELETE FROM advising_logs al
      USING students s
      WHERE al.id = $1
        AND al.advisor_user_id = $2
        AND s.id = al.student_id
        AND EXISTS (
          SELECT 1
          FROM advisor_class ac
          WHERE ac.advisor_id = $2
            AND ac.class_code = s.class_code
        )
      RETURNING al.id
      `,
        [logId, advisorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y ghi chÃº tÆ° váº¥n.' });
    }

    return res.json({ message: 'ÄÃ£ xÃ³a ghi chÃº tÆ° váº¥n.' });
  } catch (err) {
    console.error('DELETE /advisor/log-notes/:id ERROR:', err.message);
    return res.status(500).json({ message: 'Lá»—i server khi xÃ³a ghi chÃº tÆ° váº¥n.' });
  }
});


