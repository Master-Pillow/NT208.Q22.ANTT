import { pool } from '../db.js';

// ===============================================================
// Schema bootstrap — idempotent, chạy lúc khởi động để áp lên DB
// sẵn có mà không cần reset. Khớp với database/schema_demo.sql.
// ===============================================================
export async function ensureMessagingSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dm_threads (
      id BIGSERIAL PRIMARY KEY,
      user_a_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (user_a_id < user_b_id),
      UNIQUE (user_a_id, user_b_id)
    );

    CREATE TABLE IF NOT EXISTS dm_messages (
      id BIGSERIAL PRIMARY KEY,
      thread_id BIGINT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
      sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_dm_messages_thread_created
      ON dm_messages(thread_id, created_at);

    CREATE TABLE IF NOT EXISTS message_notif_prefs (
      user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      peer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted        BOOLEAN NOT NULL DEFAULT FALSE,
      last_emailed_at TIMESTAMPTZ,
      PRIMARY KEY (user_id, peer_user_id)
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS message_email_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  `);
}

// ===============================================================
// Thread key helpers — 'advisor:<conversationId>' | 'peer:<dmThreadId>'
// ===============================================================
export function parseThreadKey(key) {
  const match = /^(advisor|peer):(\d+)$/.exec(String(key || ''));
  if (!match) return null;
  return { kind: match[1], id: Number(match[2]) };
}

export function buildThreadKey(kind, id) {
  return `${kind}:${id}`;
}

/**
 * Chuẩn hoá 1 dòng message về cùng một shape cho UI sinh viên, bất kể đến từ
 * bảng `messages` (advisor) hay `dm_messages` (peer). `mine` được client tự tính
 * bằng sender_id === currentUserId nên không nhúng ở đây.
 */
export function normalizeMessageRow(row, key) {
  return {
    id: Number(row.id),
    key,
    sender_id: Number(row.sender_id),
    content: row.content,
    created_at: row.created_at,
    is_read: Boolean(row.is_read),
  };
}

/**
 * Trả về user id của 2 phía trong 1 conversation advisor↔student.
 * { advisorUserId, studentUserId } hoặc null nếu không tồn tại.
 */
export async function getConversationParticipantUserIds(conversationId) {
  const result = await pool.query(
    `
    SELECT c.advisor_id AS advisor_user_id, su.id AS student_user_id
    FROM conversations c
    JOIN users su ON su.student_id = c.student_id
    WHERE c.id = $1
    LIMIT 1
    `,
    [conversationId]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    advisorUserId: Number(row.advisor_user_id),
    studentUserId: Number(row.student_user_id),
  };
}

/**
 * Trả về user id của 2 phía trong 1 dm_thread. { userAId, userBId } hoặc null.
 */
export async function getDmThreadParticipantUserIds(threadId) {
  const result = await pool.query(
    `SELECT user_a_id, user_b_id FROM dm_threads WHERE id = $1 LIMIT 1`,
    [threadId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { userAId: Number(row.user_a_id), userBId: Number(row.user_b_id) };
}

/**
 * Phát sự kiện realtime đã chuẩn hoá tới phòng `user_<id>` của cả 2 phía.
 * Client lắng nghe 'message:new' trên phòng của chính mình.
 */
export function emitMessageNew(io, { key, message, userIds }) {
  if (!io) return;
  const payload = { key, message };
  for (const uid of userIds) {
    if (uid) io.to(`user_${uid}`).emit('message:new', payload);
  }
}

export function emitMessageRead(io, { key, readerId, messageIds, userIds }) {
  if (!io || !messageIds?.length) return;
  const payload = { key, reader_id: Number(readerId), message_ids: messageIds };
  for (const uid of userIds) {
    if (uid) io.to(`user_${uid}`).emit('message:read', payload);
  }
}
