import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { pool } from '../db.js';

function isEmailConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.from);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SEVERITY_LABEL = {
  HIGH: 'Nghiêm trọng',
  MEDIUM: 'Cần lưu ý',
  LOW: 'Thông tin',
};

const SEVERITY_COLOR = {
  HIGH: '#dc2626',
  MEDIUM: '#d97706',
  LOW: '#2563eb',
};

/**
 * Gửi email cảnh báo học vụ (digest) tới sinh viên: gộp toàn bộ bất thường mới
 * trong một lần gửi, tiếng Việt có dấu. Trả về kết quả của sendNotificationEmail.
 */
export async function sendStudentAlertEmail({ to, studentName, anomalies = [] }) {
  const safeName = escapeHtml(studentName || 'bạn');
  const count = anomalies.length;
  const subject = `⚠️ Cảnh báo học vụ: ${count} vấn đề cần lưu ý`;

  const itemsHtml = anomalies
    .map((a) => {
      const color = SEVERITY_COLOR[a.severity] || '#475569';
      const sev = SEVERITY_LABEL[a.severity] || escapeHtml(a.severity || '');
      return `
        <li style="margin:0 0 14px 0; padding:12px 14px; border-left:4px solid ${color}; background:#f8fafc; border-radius:6px; list-style:none;">
          <div style="font-weight:600; color:#0f172a;">${escapeHtml(a.title)}
            <span style="font-size:12px; font-weight:500; color:${color};">· ${sev}</span>
          </div>
          <div style="color:#334155; margin-top:4px;">${escapeHtml(a.description || '')}</div>
          ${
            a.suggested_action
              ? `<div style="color:#64748b; margin-top:6px; font-size:13px;">💡 Gợi ý: ${escapeHtml(a.suggested_action)}</div>`
              : ''
          }
        </li>`;
    })
    .join('');

  const html = `
  <div style="max-width:600px; margin:0 auto; font-family:Arial,Helvetica,sans-serif; color:#0f172a;">
    <div style="background:#1d4ed8; color:#ffffff; padding:18px 22px; border-radius:10px 10px 0 0;">
      <h2 style="margin:0; font-size:18px;">🎓 AdvisorHub — Cảnh báo học vụ</h2>
    </div>
    <div style="border:1px solid #e2e8f0; border-top:none; padding:22px; border-radius:0 0 10px 10px;">
      <p style="margin-top:0;">Chào <strong>${safeName}</strong>,</p>
      <p>Hệ thống ghi nhận <strong>${count}</strong> vấn đề trong kết quả học tập của bạn cần được lưu ý:</p>
      <ul style="padding:0; margin:16px 0;">${itemsHtml}</ul>
      <p style="margin-bottom:4px;">Bạn nên chủ động liên hệ <strong>cố vấn học vụ</strong> để được hỗ trợ kịp thời.</p>
      <p style="font-size:12px; color:#94a3b8; margin-top:20px;">Email được gửi tự động từ AdvisorHub. Vui lòng không trả lời email này.</p>
    </div>
  </div>`;

  const text = [
    `Chào ${studentName || 'bạn'},`,
    `Hệ thống ghi nhận ${count} vấn đề trong kết quả học tập của bạn cần lưu ý:`,
    '',
    ...anomalies.map(
      (a, i) =>
        `${i + 1}. [${SEVERITY_LABEL[a.severity] || a.severity}] ${a.title}\n   ${a.description || ''}\n   Gợi ý: ${a.suggested_action || ''}`
    ),
    '',
    'Bạn nên chủ động liên hệ cố vấn học vụ để được hỗ trợ kịp thời.',
    '',
    'Email được gửi tự động từ AdvisorHub.',
  ].join('\n');

  return sendNotificationEmail({ to, subject, text, html });
}

/**
 * Email báo có tin nhắn mới. Template tiếng Việt, tái dùng sendNotificationEmail.
 */
export async function sendNewMessageEmail({ to, recipientName, senderName, preview }) {
  const safeRecipient = escapeHtml(recipientName || 'bạn');
  const safeSender = escapeHtml(senderName || 'Một người dùng');
  const safePreview = escapeHtml(preview || '');
  const subject = `💬 Tin nhắn mới từ ${senderName || 'AdvisorHub'}`;

  const html = `
  <div style="max-width:600px; margin:0 auto; font-family:Arial,Helvetica,sans-serif; color:#0f172a;">
    <div style="background:#1d4ed8; color:#ffffff; padding:18px 22px; border-radius:10px 10px 0 0;">
      <h2 style="margin:0; font-size:18px;">🎓 AdvisorHub — Tin nhắn mới</h2>
    </div>
    <div style="border:1px solid #e2e8f0; border-top:none; padding:22px; border-radius:0 0 10px 10px;">
      <p style="margin-top:0;">Chào <strong>${safeRecipient}</strong>,</p>
      <p>Bạn vừa nhận được tin nhắn mới từ <strong>${safeSender}</strong>:</p>
      <blockquote style="margin:16px 0; padding:12px 16px; border-left:4px solid #1d4ed8; background:#f8fafc; border-radius:6px; color:#334155;">
        ${safePreview}
      </blockquote>
      <p style="margin-bottom:4px;">Đăng nhập AdvisorHub để xem và trả lời.</p>
      <p style="font-size:12px; color:#94a3b8; margin-top:20px;">Bạn có thể tắt thông báo email cho người này hoặc tắt toàn bộ trong trang Tin nhắn. Email được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>`;

  const text = [
    `Chào ${recipientName || 'bạn'},`,
    `Bạn vừa nhận được tin nhắn mới từ ${senderName || 'một người dùng'}:`,
    '',
    preview || '',
    '',
    'Đăng nhập AdvisorHub để xem và trả lời.',
  ].join('\n');

  return sendNotificationEmail({ to, subject, text, html });
}

/**
 * Điều phối gửi email khi có tin nhắn mới. Tôn trọng: công tắc chung của hệ thống,
 * công tắc chung của người nhận, mute theo từng người, người nhận đang ONLINE
 * (có socket mở) → bỏ qua, và throttle (không quá 1 email/người-gửi trong N phút).
 *
 * Luôn nuốt lỗi (fire-and-forget) để KHÔNG bao giờ chặn việc gửi tin nhắn.
 */
export async function notifyNewMessageByEmail({ io, recipientUserId, senderUserId, content }) {
  try {
    if (!config.messageEmail.enabled) return { sent: false, reason: 'disabled' };
    if (!recipientUserId || !senderUserId) return { sent: false, reason: 'missing_ids' };

    // 1) Người nhận online? (có ít nhất 1 socket trong phòng user_<id>) → không gửi.
    if (io) {
      const sockets = await io.in(`user_${recipientUserId}`).fetchSockets();
      if (sockets.length > 0) return { sent: false, reason: 'recipient_online' };
    }

    // 2) Thông tin người nhận + công tắc chung.
    const recipientRes = await pool.query(
      `SELECT email, full_name, COALESCE(message_email_enabled, TRUE) AS message_email_enabled
       FROM users WHERE id = $1 LIMIT 1`,
      [recipientUserId]
    );
    const recipient = recipientRes.rows[0];
    if (!recipient || !recipient.email) return { sent: false, reason: 'no_email' };
    if (!recipient.message_email_enabled) return { sent: false, reason: 'globally_muted' };

    // 3) Mute theo người + throttle (đọc/ghi cùng bảng message_notif_prefs).
    const prefRes = await pool.query(
      `SELECT muted, last_emailed_at FROM message_notif_prefs
       WHERE user_id = $1 AND peer_user_id = $2 LIMIT 1`,
      [recipientUserId, senderUserId]
    );
    const pref = prefRes.rows[0];
    if (pref?.muted) return { sent: false, reason: 'peer_muted' };

    if (pref?.last_emailed_at) {
      const elapsedMs = Date.now() - new Date(pref.last_emailed_at).getTime();
      if (elapsedMs < config.messageEmail.throttleMinutes * 60 * 1000) {
        return { sent: false, reason: 'throttled' };
      }
    }

    // 4) Tên người gửi.
    const senderRes = await pool.query(
      `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
      [senderUserId]
    );
    const senderName = senderRes.rows[0]?.full_name || 'Một người dùng';

    const result = await sendNewMessageEmail({
      to: recipient.email,
      recipientName: recipient.full_name,
      senderName,
      preview: String(content || '').slice(0, 300),
    });

    // 5) Ghi nhận mốc throttle nếu thực sự đã gửi (không phải skipped).
    if (result?.sent) {
      await pool.query(
        `INSERT INTO message_notif_prefs (user_id, peer_user_id, muted, last_emailed_at)
         VALUES ($1, $2, FALSE, NOW())
         ON CONFLICT (user_id, peer_user_id)
         DO UPDATE SET last_emailed_at = NOW()`,
        [recipientUserId, senderUserId]
      );
    }

    return result;
  } catch (err) {
    console.error('[notifyNewMessageByEmail]', err.message);
    return { sent: false, reason: 'error' };
  }
}

export async function sendNotificationEmail({ to, subject, text, html }) {
  if (!to) {
    return { sent: false, skipped: true, reason: 'missing_recipient' };
  }

  if (!isEmailConfigured()) {
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text: text || stripHtml(html),
    html,
  });

  return { sent: true, skipped: false };
}
