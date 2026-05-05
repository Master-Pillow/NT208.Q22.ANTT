import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /appointments?month=2026-10
router.get('/', async (req, res) => {
  const advisorId = req.user.id;
  const { month } = req.query;

  try {
    let whereClause = 'WHERE a.advisor_id = $1';
    const params = [advisorId];

    if (month) {
      whereClause += ` AND to_char(a.start_time, 'YYYY-MM') = $2`;
      params.push(month);
    }

    const result = await pool.query(`
      SELECT
        a.*,
        s.full_name AS student_name,
        s.mssv      AS student_mssv
      FROM appointments a
      LEFT JOIN students s ON s.id = a.student_id
      ${whereClause}
      ORDER BY a.start_time ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /appointments ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /appointments — tạo lịch mới
router.post('/', async (req, res) => {
  const advisorId = req.user.id;
  const { student_id, title, location, start_time, end_time, type, note } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ message: 'Thiếu title, start_time hoặc end_time' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO appointments
        (advisor_id, student_id, title, location, start_time, end_time, type, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [advisorId, student_id || null, title, location || null,
        start_time, end_time, type || 'MEETING', note || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /appointments ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /appointments/:id — cập nhật status hoặc note
router.patch('/:id', async (req, res) => {
  const advisorId = req.user.id;
  const { status, note, title, location, start_time, end_time } = req.body;

  try {
    const result = await pool.query(`
      UPDATE appointments
      SET
        status     = COALESCE($1, status),
        note       = COALESCE($2, note),
        title      = COALESCE($3, title),
        location   = COALESCE($4, location),
        start_time = COALESCE($5, start_time),
        end_time   = COALESCE($6, end_time)
      WHERE id = $7 AND advisor_id = $8
      RETURNING *
    `, [status, note, title, location, start_time, end_time,
        req.params.id, advisorId]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /appointments ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM appointments WHERE id=$1 AND advisor_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Đã xóa lịch hẹn' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;