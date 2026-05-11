import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
const ADVISOR_ACTION_STATUSES = ['confirmed', 'cancelled'];

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function isAdvisorRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'ADVISOR' || normalized === 'ADMIN' || normalized === 'COVAN' || normalized === 'CO_VAN';
}

async function requireAdvisor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }

  if (isAdvisorRole(req.user.role)) {
    req.user.role = normalizeRole(req.user.role) === 'ADMIN' ? 'ADMIN' : 'ADVISOR';
    return next();
  }

  try {
    const userResult = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );

    const dbUser = userResult.rows[0];

    if (dbUser && isAdvisorRole(dbUser.role)) {
      req.user.role = normalizeRole(dbUser.role) === 'ADMIN' ? 'ADMIN' : 'ADVISOR';
      return next();
    }

    return res.status(403).json({
      message: 'Chỉ cố vấn mới được truy cập chức năng này',
      detail: 'Token hiện tại không thuộc tài khoản cố vấn/admin. Hãy đăng xuất, xóa localStorage và đăng nhập lại.',
    });
  } catch (err) {
    console.error('[requireAdvisor]', err);
    return res.status(500).json({
      message: 'Lỗi kiểm tra quyền cố vấn',
      detail: err.message,
    });
  }
}

function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return null;
  const normalized = status.toLowerCase();
  return VALID_STATUSES.includes(normalized) ? normalized : null;
}

const appointmentSelect = `
  SELECT
    a.*,
    s.full_name AS student_name,
    s.mssv      AS student_mssv,
    s.email     AS student_email,
    student_user.id AS student_user_id
  FROM appointments a
  LEFT JOIN students s ON s.id = a.student_id
  LEFT JOIN users student_user ON student_user.student_id = s.id
`;

// GET /appointments?month=2026-10&status=confirmed
// Dùng cho màn lịch của cố vấn. Nếu truyền status=confirmed thì chỉ lấy lịch đã duyệt.
router.get('/', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const { month, status } = req.query;

  try {
    const where = ['a.advisor_id = $1'];
    const params = [advisorId];

    if (month) {
      params.push(month);
      where.push(`to_char(a.start_time, 'YYYY-MM') = $${params.length}`);
    }

    const normalizedStatus = normalizeStatus(status);
    if (status && !normalizedStatus) {
      return res.status(400).json({ message: 'Trạng thái lịch hẹn không hợp lệ' });
    }

    if (normalizedStatus) {
      params.push(normalizedStatus);
      where.push(`a.status = $${params.length}`);
    }

    const result = await pool.query(
      `
      ${appointmentSelect}
      WHERE ${where.join(' AND ')}
      ORDER BY a.start_time ASC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /appointments ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /appointments/pending — danh sách yêu cầu sinh viên đang chờ cố vấn duyệt.
router.get('/pending', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;

  try {
    const result = await pool.query(
      `
      ${appointmentSelect}
      WHERE a.advisor_id = $1 AND a.status = 'pending'
      ORDER BY a.created_at DESC, a.start_time ASC
      `,
      [advisorId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /appointments/pending ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /appointments/pending/count — badge số lượng trên chuông.
router.get('/pending/count', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM appointments
      WHERE advisor_id = $1 AND status = 'pending'
      `,
      [advisorId]
    );

    res.json(result.rows[0] || { count: 0 });
  } catch (err) {
    console.error('GET /appointments/pending/count ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /appointments — cố vấn tự tạo lịch mới. Mặc định là lịch đã xác nhận.
router.post('/', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const { student_id, title, location, start_time, end_time, type, note } = req.body;

  if (!title || !start_time || !end_time) {
    return res.status(400).json({ message: 'Thiếu title, start_time hoặc end_time' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO appointments
        (advisor_id, student_id, title, location, start_time, end_time, type, note, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirmed')
      RETURNING *
      `,
      [
        advisorId,
        student_id || null,
        title,
        location || null,
        start_time,
        end_time,
        type || 'MEETING',
        note || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /appointments ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

async function notifyStudentAboutAdvisorDecision(appointment, status) {
  if (!appointment.student_user_id) return;

  const accepted = status === 'confirmed';
  const title = accepted
    ? 'Lịch tư vấn đã được chấp nhận'
    : 'Yêu cầu đặt lịch tư vấn đã bị từ chối';

  const content = accepted
    ? `Cố vấn đã chấp nhận lịch "${appointment.title}" vào ${new Date(appointment.start_time).toLocaleString('vi-VN')}.`
    : `Cố vấn đã từ chối lịch "${appointment.title}" vào ${new Date(appointment.start_time).toLocaleString('vi-VN')}.`;

  await pool.query(
    `
    INSERT INTO notifications (user_id, title, content, type)
    VALUES ($1, $2, $3, 'APPOINTMENT')
    `,
    [appointment.student_user_id, title, content]
  );
}

// PATCH /appointments/:id/status — cố vấn chấp nhận / từ chối yêu cầu đặt lịch.
router.patch('/:id/status', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const status = normalizeStatus(req.body.status);

  if (!status || !ADVISOR_ACTION_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái chỉ được là confirmed hoặc cancelled' });
  }

  try {
    const result = await pool.query(
      `
      UPDATE appointments a
      SET status = $1
      WHERE a.id = $2 AND a.advisor_id = $3 AND a.status = 'pending'
      RETURNING a.*
      `,
      [status, req.params.id, advisorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn đang chờ duyệt' });
    }

    const detailResult = await pool.query(
      `
      ${appointmentSelect}
      WHERE a.id = $1 AND a.advisor_id = $2
      LIMIT 1
      `,
      [req.params.id, advisorId]
    );

    const appointment = detailResult.rows[0] || result.rows[0];

    await notifyStudentAboutAdvisorDecision(appointment, status);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${advisorId}`).emit('appointment_request_updated', appointment);
      if (appointment.student_user_id) {
        io.to(`user_${appointment.student_user_id}`).emit('appointment_status_updated', appointment);
      }
    }

    res.json(appointment);
  } catch (err) {
    console.error('PATCH /appointments/:id/status ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /appointments/:id — cập nhật thông tin lịch hẹn. Giữ lại để tương thích code cũ.
router.patch('/:id', requireAdvisor, async (req, res) => {
  const advisorId = req.user.id;
  const { status, note, title, location, start_time, end_time, type } = req.body;
  const normalizedStatus = status ? normalizeStatus(status) : null;

  if (status && !normalizedStatus) {
    return res.status(400).json({ message: 'Trạng thái lịch hẹn không hợp lệ' });
  }

  try {
    const result = await pool.query(
      `
      UPDATE appointments
      SET
        status     = COALESCE($1, status),
        note       = COALESCE($2, note),
        title      = COALESCE($3, title),
        location   = COALESCE($4, location),
        start_time = COALESCE($5, start_time),
        end_time   = COALESCE($6, end_time),
        type       = COALESCE($7, type)
      WHERE id = $8 AND advisor_id = $9
      RETURNING *
      `,
      [
        normalizedStatus,
        note,
        title,
        location,
        start_time,
        end_time,
        type,
        req.params.id,
        advisorId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy lịch hẹn' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${advisorId}`).emit('appointment_request_updated', result.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /appointments ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /appointments/:id
router.delete('/:id', requireAdvisor, async (req, res) => {
  try {
    await pool.query('DELETE FROM appointments WHERE id=$1 AND advisor_id=$2', [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: 'Đã xóa lịch hẹn' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
