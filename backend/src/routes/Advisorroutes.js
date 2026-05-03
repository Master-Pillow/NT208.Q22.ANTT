// routes/advisorRoutes.js
import { Router } from 'express';
import { pool } from '../db.js';   // ← relative path lên thư mục cha

const router = Router();

// GET /advisor/students?advisorId=<id>
router.get('/students', async (req, res) => {
  const advisorId = req.user.id; // ✅ Chỉ lấy ID từ token

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
    return res.status(500).json({ message: 'Lỗi server khi lấy danh sách sinh viên.' });
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
    return res.status(500).json({ message: 'Lỗi server khi lấy thống kê.' });
  }
});

export default router;