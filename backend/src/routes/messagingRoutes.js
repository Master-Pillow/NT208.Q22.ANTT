import express from 'express';
import { pool } from '../db.js';
import { notifyNewMessageByEmail } from '../services/emailService.js';
import {
  parseThreadKey,
  buildThreadKey,
  normalizeMessageRow,
  getConversationParticipantUserIds,
  getDmThreadParticipantUserIds,
  emitMessageNew,
  emitMessageRead,
} from '../services/messagingService.js';

const router = express.Router();

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

// Lấy hồ sơ sinh viên gắn với user hiện tại (để biết lớp sinh hoạt, mssv).
async function getStudentForUser(userId) {
  const result = await pool.query(
    `
    SELECT s.id AS student_id, s.class_code, s.mssv, s.full_name
    FROM users u
    JOIN students s ON s.id = u.student_id
    WHERE u.id = $1
    LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

// ===============================================================
// GET /messaging/contacts — người sinh viên có thể nhắn tin
//   { advisors: [{user_id,name,email}], classmates: [{user_id,mssv,name}] }
// ===============================================================
router.get('/contacts', async (req, res) => {
  try {
    if (normalizeRole(req.user.role) !== 'STUDENT') {
      return res.status(403).json({ message: 'Chỉ sinh viên dùng được danh bạ này.' });
    }

    const student = await getStudentForUser(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ sinh viên.' });
    }

    const advisorsRes = await pool.query(
      `
      SELECT DISTINCT u.id AS user_id, u.full_name AS name, u.email
      FROM advisor_class ac
      JOIN users u ON u.id = ac.advisor_id
      WHERE ac.class_code = $1
      ORDER BY u.full_name ASC
      `,
      [student.class_code]
    );

    const classmatesRes = await pool.query(
      `
      SELECT u.id AS user_id, s.mssv, s.full_name AS name
      FROM students s
      JOIN users u ON u.student_id = s.id
      WHERE s.class_code = $1
        AND s.id <> $2
      ORDER BY s.full_name ASC
      `,
      [student.class_code, student.student_id]
    );

    return res.json({
      advisors: advisorsRes.rows,
      classmates: classmatesRes.rows,
    });
  } catch (err) {
    console.error('[messaging/contacts]', err);
    return res.status(500).json({ message: 'Lỗi tải danh bạ', detail: err.message });
  }
});

// SQL gộp 2 hệ hội thoại của 1 user (advisor conversations + dm threads), đã chuẩn hoá.
async function loadThreadsForUser(userId) {
  const advisorRes = await pool.query(
    `
    SELECT
      'advisor:' || c.id AS key,
      'advisor'::text AS kind,
      c.advisor_id AS peer_user_id,
      adv.full_name AS peer_name,
      adv.email AS peer_detail,
      latest.content AS last_message,
      latest.created_at AS last_message_at,
      COALESCE(unread.cnt, 0)::int AS unread_count,
      COALESCE(pref.muted, FALSE) AS muted
    FROM conversations c
    JOIN users su ON su.student_id = c.student_id
    JOIN users adv ON adv.id = c.advisor_id
    LEFT JOIN LATERAL (
      SELECT content, created_at FROM messages
      WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM messages
      WHERE conversation_id = c.id
        AND sender_role = 'ADVISOR'
        AND COALESCE(is_read, FALSE) = FALSE
    ) unread ON TRUE
    LEFT JOIN message_notif_prefs pref
      ON pref.user_id = su.id AND pref.peer_user_id = c.advisor_id
    WHERE su.id = $1
    `,
    [userId]
  );

  const dmRes = await pool.query(
    `
    SELECT
      'peer:' || t.id AS key,
      'peer'::text AS kind,
      peer.id AS peer_user_id,
      COALESCE(ps.full_name, peer.full_name) AS peer_name,
      ps.mssv AS peer_detail,
      latest.content AS last_message,
      latest.created_at AS last_message_at,
      COALESCE(unread.cnt, 0)::int AS unread_count,
      COALESCE(pref.muted, FALSE) AS muted
    FROM dm_threads t
    JOIN users peer
      ON peer.id = CASE WHEN t.user_a_id = $1 THEN t.user_b_id ELSE t.user_a_id END
    LEFT JOIN students ps ON ps.id = peer.student_id
    LEFT JOIN LATERAL (
      SELECT content, created_at FROM dm_messages
      WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM dm_messages
      WHERE thread_id = t.id AND sender_id <> $1 AND read_at IS NULL
    ) unread ON TRUE
    LEFT JOIN message_notif_prefs pref
      ON pref.user_id = $1 AND pref.peer_user_id = peer.id
    WHERE t.user_a_id = $1 OR t.user_b_id = $1
    `,
    [userId]
  );

  const merged = [...advisorRes.rows, ...dmRes.rows];
  merged.sort((a, b) => {
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });
  return merged;
}

// ===============================================================
// GET /messaging/threads — danh bạ đã có hội thoại (đã chuẩn hoá)
// ===============================================================
router.get('/threads', async (req, res) => {
  try {
    const threads = await loadThreadsForUser(req.user.id);
    return res.json(threads);
  } catch (err) {
    console.error('[messaging/threads]', err);
    return res.status(500).json({ message: 'Lỗi tải hội thoại', detail: err.message });
  }
});

// Kiểm tra quyền truy cập 1 thread theo key; trả participant user ids + meta.
async function authorizeThread(key, user) {
  const parsed = parseThreadKey(key);
  if (!parsed) return { error: 400, message: 'Khoá hội thoại không hợp lệ.' };

  const userId = Number(user.id);

  if (parsed.kind === 'advisor') {
    const parts = await getConversationParticipantUserIds(parsed.id);
    if (!parts) return { error: 404, message: 'Không tìm thấy hội thoại.' };
    const isParticipant =
      userId === parts.advisorUserId || userId === parts.studentUserId;
    if (!isParticipant && normalizeRole(user.role) !== 'ADMIN') {
      return { error: 403, message: 'Bạn không có quyền với hội thoại này.' };
    }
    return {
      parsed,
      userIds: [parts.advisorUserId, parts.studentUserId],
      recipientUserId:
        userId === parts.advisorUserId ? parts.studentUserId : parts.advisorUserId,
    };
  }

  // peer
  const parts = await getDmThreadParticipantUserIds(parsed.id);
  if (!parts) return { error: 404, message: 'Không tìm thấy hội thoại.' };
  const isParticipant = userId === parts.userAId || userId === parts.userBId;
  if (!isParticipant) {
    return { error: 403, message: 'Bạn không có quyền với hội thoại này.' };
  }
  return {
    parsed,
    userIds: [parts.userAId, parts.userBId],
    recipientUserId: userId === parts.userAId ? parts.userBId : parts.userAId,
  };
}

// ===============================================================
// POST /messaging/threads — get-or-create theo peer_user_id
// ===============================================================
router.post('/threads', async (req, res) => {
  try {
    const peerUserId = Number(req.body?.peer_user_id);
    if (!Number.isInteger(peerUserId) || peerUserId <= 0) {
      return res.status(400).json({ message: 'Thiếu peer_user_id hợp lệ.' });
    }
    if (peerUserId === Number(req.user.id)) {
      return res.status(400).json({ message: 'Không thể tự nhắn cho chính mình.' });
    }

    const role = normalizeRole(req.user.role);
    if (role !== 'STUDENT') {
      return res.status(403).json({ message: 'Chỉ sinh viên được tạo hội thoại từ đây.' });
    }

    const me = await getStudentForUser(req.user.id);
    if (!me) return res.status(404).json({ message: 'Không tìm thấy hồ sơ sinh viên.' });

    const peerRes = await pool.query(
      `SELECT id, role, student_id FROM users WHERE id = $1 LIMIT 1`,
      [peerUserId]
    );
    const peer = peerRes.rows[0];
    if (!peer) return res.status(404).json({ message: 'Không tìm thấy người nhận.' });

    const peerRole = normalizeRole(peer.role);
    let key;

    if (peerRole === 'ADVISOR') {
      // Advisor phải phụ trách lớp sinh hoạt của sinh viên.
      const allowed = await pool.query(
        `SELECT 1 FROM advisor_class WHERE advisor_id = $1 AND class_code = $2 LIMIT 1`,
        [peerUserId, me.class_code]
      );
      if (allowed.rows.length === 0) {
        return res.status(403).json({ message: 'Cố vấn này không phụ trách lớp của bạn.' });
      }
      const conv = await pool.query(
        `
        INSERT INTO conversations (advisor_id, student_id)
        VALUES ($1, $2)
        ON CONFLICT (advisor_id, student_id) DO UPDATE SET advisor_id = EXCLUDED.advisor_id
        RETURNING id
        `,
        [peerUserId, me.student_id]
      );
      key = buildThreadKey('advisor', conv.rows[0].id);
    } else if (peerRole === 'STUDENT') {
      // Bạn cùng lớp sinh hoạt.
      const sameClass = await pool.query(
        `SELECT 1 FROM students WHERE id = $1 AND class_code = $2 LIMIT 1`,
        [peer.student_id, me.class_code]
      );
      if (sameClass.rows.length === 0) {
        return res.status(403).json({ message: 'Chỉ nhắn được với sinh viên cùng lớp sinh hoạt.' });
      }
      const a = Math.min(Number(req.user.id), peerUserId);
      const b = Math.max(Number(req.user.id), peerUserId);
      const thread = await pool.query(
        `
        INSERT INTO dm_threads (user_a_id, user_b_id)
        VALUES ($1, $2)
        ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET user_a_id = EXCLUDED.user_a_id
        RETURNING id
        `,
        [a, b]
      );
      key = buildThreadKey('peer', thread.rows[0].id);
    } else {
      return res.status(400).json({ message: 'Loại người nhận không hỗ trợ.' });
    }

    const threads = await loadThreadsForUser(req.user.id);
    const detail = threads.find((t) => t.key === key) || { key };
    return res.json(detail);
  } catch (err) {
    console.error('[messaging/threads create]', err);
    return res.status(500).json({ message: 'Lỗi tạo hội thoại', detail: err.message });
  }
});

// ===============================================================
// GET /messaging/threads/:key/messages
// ===============================================================
router.get('/threads/:key/messages', async (req, res) => {
  try {
    const auth = await authorizeThread(req.params.key, req.user);
    if (auth.error) return res.status(auth.error).json({ message: auth.message });

    const { parsed } = auth;
    let rows;
    if (parsed.kind === 'advisor') {
      const result = await pool.query(
        `SELECT id, sender_id, content, created_at, COALESCE(is_read, FALSE) AS is_read
         FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [parsed.id]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT id, sender_id, content, created_at, (read_at IS NOT NULL) AS is_read
         FROM dm_messages WHERE thread_id = $1 ORDER BY created_at ASC`,
        [parsed.id]
      );
      rows = result.rows;
    }

    const key = buildThreadKey(parsed.kind, parsed.id);
    return res.json(rows.map((r) => normalizeMessageRow(r, key)));
  } catch (err) {
    console.error('[messaging/messages]', err);
    return res.status(500).json({ message: 'Lỗi tải tin nhắn', detail: err.message });
  }
});

// ===============================================================
// POST /messaging/threads/:key/messages — gửi 1 tin nhắn
// ===============================================================
router.post('/threads/:key/messages', async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ message: 'Tin nhắn không được để trống.' });

    const auth = await authorizeThread(req.params.key, req.user);
    if (auth.error) return res.status(auth.error).json({ message: auth.message });

    const { parsed, userIds, recipientUserId } = auth;
    const key = buildThreadKey(parsed.kind, parsed.id);
    const io = req.app.get('io');
    let normalized;

    if (parsed.kind === 'advisor') {
      const senderRole = normalizeRole(req.user.role) === 'STUDENT' ? 'STUDENT' : 'ADVISOR';
      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_role, sender_id, content)
         VALUES ($1, $2, $3, $4) RETURNING id, sender_id, content, created_at, is_read`,
        [parsed.id, senderRole, req.user.id, content]
      );
      normalized = normalizeMessageRow(result.rows[0], key);
      // Hệ cũ: advisor UI vẫn nghe 'new_message' trong phòng conv_<id>.
      if (io) {
        io.to(`conv_${parsed.id}`).emit('new_message', {
          ...result.rows[0],
          conversation_id: parsed.id,
          sender_role: senderRole,
        });
      }
    } else {
      const result = await pool.query(
        `INSERT INTO dm_messages (thread_id, sender_id, content)
         VALUES ($1, $2, $3) RETURNING id, sender_id, content, created_at, (read_at IS NOT NULL) AS is_read`,
        [parsed.id, req.user.id, content]
      );
      normalized = normalizeMessageRow(result.rows[0], key);
    }

    // Realtime chuẩn hoá tới phòng user của cả 2 phía.
    emitMessageNew(io, { key, message: normalized, userIds });

    // Email (offline + throttle + mute) — fire-and-forget.
    notifyNewMessageByEmail({
      io,
      recipientUserId,
      senderUserId: Number(req.user.id),
      content,
    }).catch(() => {});

    return res.status(201).json(normalized);
  } catch (err) {
    console.error('[messaging/send]', err);
    return res.status(500).json({ message: 'Lỗi gửi tin nhắn', detail: err.message });
  }
});

// ===============================================================
// PATCH /messaging/threads/:key/read — đánh dấu đã đọc tin phía bên kia
// ===============================================================
router.patch('/threads/:key/read', async (req, res) => {
  try {
    const auth = await authorizeThread(req.params.key, req.user);
    if (auth.error) return res.status(auth.error).json({ message: auth.message });

    const { parsed, userIds } = auth;
    const key = buildThreadKey(parsed.kind, parsed.id);
    const io = req.app.get('io');
    let readIds = [];

    if (parsed.kind === 'advisor') {
      const myRole = normalizeRole(req.user.role) === 'STUDENT' ? 'STUDENT' : 'ADVISOR';
      const result = await pool.query(
        `UPDATE messages SET is_read = TRUE
         WHERE conversation_id = $1 AND sender_role <> $2 AND COALESCE(is_read, FALSE) = FALSE
         RETURNING id`,
        [parsed.id, myRole]
      );
      readIds = result.rows.map((r) => Number(r.id));
      // Hệ cũ: advisor UI nghe 'messages_read' trong phòng conv_<id>.
      if (io && readIds.length > 0) {
        io.to(`conv_${parsed.id}`).emit('messages_read', {
          conversationId: parsed.id,
          readerRole: myRole,
          messageIds: readIds,
        });
      }
    } else {
      const result = await pool.query(
        `UPDATE dm_messages SET read_at = NOW()
         WHERE thread_id = $1 AND sender_id <> $2 AND read_at IS NULL
         RETURNING id`,
        [parsed.id, req.user.id]
      );
      readIds = result.rows.map((r) => Number(r.id));
    }

    if (readIds.length > 0) {
      emitMessageRead(io, { key, readerId: req.user.id, messageIds: readIds, userIds });
    }

    return res.json({ key, read_message_ids: readIds });
  } catch (err) {
    console.error('[messaging/read]', err);
    return res.status(500).json({ message: 'Lỗi cập nhật đã đọc', detail: err.message });
  }
});

// ===============================================================
// PUT /messaging/mute — bật/tắt email theo từng người
// ===============================================================
router.put('/mute', async (req, res) => {
  try {
    const peerUserId = Number(req.body?.peer_user_id);
    const muted = Boolean(req.body?.muted);
    if (!Number.isInteger(peerUserId) || peerUserId <= 0) {
      return res.status(400).json({ message: 'Thiếu peer_user_id hợp lệ.' });
    }

    await pool.query(
      `INSERT INTO message_notif_prefs (user_id, peer_user_id, muted)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, peer_user_id) DO UPDATE SET muted = EXCLUDED.muted`,
      [req.user.id, peerUserId, muted]
    );

    return res.json({ peer_user_id: peerUserId, muted });
  } catch (err) {
    console.error('[messaging/mute]', err);
    return res.status(500).json({ message: 'Lỗi cập nhật tắt thông báo', detail: err.message });
  }
});

// ===============================================================
// GET/PUT /messaging/settings — công tắc email chung của tài khoản
// ===============================================================
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(message_email_enabled, TRUE) AS message_email_enabled
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    return res.json({
      message_email_enabled: Boolean(result.rows[0]?.message_email_enabled ?? true),
    });
  } catch (err) {
    console.error('[messaging/settings get]', err);
    return res.status(500).json({ message: 'Lỗi tải cấu hình', detail: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const enabled = Boolean(req.body?.message_email_enabled);
    await pool.query(`UPDATE users SET message_email_enabled = $1 WHERE id = $2`, [
      enabled,
      req.user.id,
    ]);
    return res.json({ message_email_enabled: enabled });
  } catch (err) {
    console.error('[messaging/settings put]', err);
    return res.status(500).json({ message: 'Lỗi cập nhật cấu hình', detail: err.message });
  }
});

export default router;
