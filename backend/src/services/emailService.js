import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import dns from 'node:dns';
import { config } from '../config.js';
import { pool } from '../db.js';
import { studentEmail } from '../utils/uitEmail.js';

function isEmailConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.from);
}

/**
 * Tạo transporter SMTP, ÉP dùng IPv4.
 *
 * Lý do: nodemailer phân giải hostname ra cả IPv4 lẫn IPv6 rồi chọn NGẪU NHIÊN 1 địa
 * chỉ. Trên Render (gói free) không có định tuyến IPv6 ra ngoài → khi trúng IPv6 sẽ lỗi
 * `connect ENETUNREACH ...:587` và email không gửi được (lúc được lúc không vì là random).
 * Ta tự phân giải sang IPv4 và truyền thẳng IP làm host; giữ `servername` = hostname gốc
 * để SNI + kiểm tra chứng chỉ TLS vẫn hợp lệ.
 */
async function createMailTransport() {
  const base = {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  };
  try {
    const { address } = await dns.promises.lookup(config.smtp.host, { family: 4 });
    return nodemailer.createTransport({
      ...base,
      host: address,
      servername: config.smtp.host,
    });
  } catch {
    // Không phân giải được IPv4 → quay về dùng hostname như cũ.
    return nodemailer.createTransport(base);
  }
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
}

/**
 * Gửi qua GMAIL API (HTTPS) bằng OAuth2 refresh token.
 *
 * Đây là cách DUY NHẤT còn gửi được "từ" địa chỉ @gmail.com sau khi Google chặn các dịch
 * vụ bên thứ 3 (SMTP2GO/Brevo/SendGrid) — vì lần gửi này do CHÍNH Google thực hiện nên
 * khớp SPF/DKIM/DMARC → vào Inbox. Dùng HTTPS:443 nên host (Render) không chặn như SMTP.
 * Cần GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN của tài khoản người gửi.
 */
async function getGmailAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.gmailApi.clientId,
      client_secret: config.gmailApi.clientSecret,
      refresh_token: config.gmailApi.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Gmail OAuth ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data.access_token;
}

async function sendViaGmailApi({ to, subject, text, html }) {
  const accessToken = await getGmailAccessToken();
  // Dựng message RFC822 chuẩn (đa phần text+html, UTF-8, encode tiêu đề có dấu) rồi base64url.
  const mail = new MailComposer({
    from: config.smtp.from || config.smtp.user,
    to,
    subject,
    text: text || stripHtml(html),
    html,
  });
  const raw = (await mail.compile().build()).toString('base64url');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gmail API ${res.status}: ${detail.slice(0, 300)}`);
  }
  return { sent: true, skipped: false };
}

// Tách "AdvisorHub <a@b.com>" -> { name, email } cho Brevo (yêu cầu sender dạng object).
function parseSender(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || 'AdvisorHub', email: m[2].trim() };
  return { name: 'AdvisorHub', email: s };
}

/**
 * Gửi email qua SMTP2GO HTTP API (https://api.smtp2go.com/v3/email/send) bằng HTTPS cổng 443.
 * Dùng khi host chặn SMTP (vd Render free). Sender phải là email/domain đã verify trong SMTP2GO.
 * LƯU Ý: SMTP2GO trả HTTP 200 ngay cả khi gửi fail → phải kiểm tra data.succeeded >= 1.
 */
async function sendViaSmtp2go({ to, subject, text, html }) {
  const res = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      api_key: config.smtp2go.apiKey,
      sender: config.smtp.from || config.smtp.user, // chấp nhận "Tên <email>" hoặc "email"
      to: [to],
      subject,
      html_body: html || undefined,
      text_body: text || stripHtml(html),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !(Number(data?.data?.succeeded) >= 1)) {
    const detail = JSON.stringify(data?.data?.failures || data?.data?.error || data).slice(0, 300);
    throw new Error(`SMTP2GO ${res.status}: ${detail}`);
  }
  return { sent: true, skipped: false };
}

/**
 * Gửi email qua Brevo HTTP API (https://api.brevo.com/v3/smtp/email) bằng HTTPS cổng 443.
 * Dùng khi host chặn SMTP (vd Render free). Sender phải là email đã verify trong Brevo.
 * Ném lỗi nếu Brevo trả mã != 2xx để hàm gọi log lại được nguyên nhân.
 */
async function sendViaBrevo({ to, subject, text, html }) {
  const sender = parseSender(config.smtp.from || config.smtp.user);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevo.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html || undefined,
      textContent: text || stripHtml(html),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${detail.slice(0, 300)}`);
  }
  return { sent: true, skipped: false };
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
  const log = (r) => {
    console.log(
      `[messageEmail] -> user ${recipientUserId}:`,
      r.sent ? 'ĐÃ GỬI ✅' : `bỏ qua (${r.reason})`
    );
    return r;
  };

  try {
    if (!config.messageEmail.enabled) return log({ sent: false, reason: 'disabled (MESSAGE_EMAIL_ENABLED=false)' });
    if (!recipientUserId || !senderUserId) return log({ sent: false, reason: 'missing_ids' });

    // Luôn gửi email kể cả khi người nhận đang online (theo lựa chọn). Chống spam
    // bằng throttle + mute ở dưới. (io giữ lại cho tương thích chữ ký hàm.)

    // 2) Thông tin người nhận + công tắc chung.
    const recipientRes = await pool.query(
      `SELECT
         COALESCE(NULLIF(u.email, ''), NULLIF(s.email, '')) AS email,
         u.full_name,
         COALESCE(u.message_email_enabled, TRUE) AS message_email_enabled,
         s.mssv
       FROM users u
       LEFT JOIN students s ON s.id = u.student_id
       WHERE u.id = $1
       LIMIT 1`,
      [recipientUserId]
    );
    const recipient = recipientRes.rows[0];
    if (!recipient) return log({ sent: false, reason: 'user_not_found' });
    if (!recipient.message_email_enabled) return log({ sent: false, reason: 'globally_muted (tắt email chung)' });
    const recipientEmail = recipient.mssv ? studentEmail(recipient.mssv) : recipient.email;
    if (!recipientEmail) return log({ sent: false, reason: 'no_email (user chưa có email)' });

    // 3) Mute theo người + throttle (đọc/ghi cùng bảng message_notif_prefs).
    const prefRes = await pool.query(
      `SELECT muted, last_emailed_at FROM message_notif_prefs
       WHERE user_id = $1 AND peer_user_id = $2 LIMIT 1`,
      [recipientUserId, senderUserId]
    );
    const pref = prefRes.rows[0];
    if (pref?.muted) return log({ sent: false, reason: 'peer_muted (đã tắt báo người này)' });

    if (pref?.last_emailed_at) {
      const elapsedMs = Date.now() - new Date(pref.last_emailed_at).getTime();
      if (elapsedMs < config.messageEmail.throttleMinutes * 60 * 1000) {
        return log({ sent: false, reason: `throttled (chờ ${config.messageEmail.throttleMinutes} phút)` });
      }
    }

    // 4) Tên người gửi.
    const senderRes = await pool.query(
      `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
      [senderUserId]
    );
    const senderName = senderRes.rows[0]?.full_name || 'Một người dùng';

    const result = await sendNewMessageEmail({
      to: recipientEmail,
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

    return log(result?.sent ? result : { sent: false, reason: result?.reason || 'smtp_not_configured (chưa điền SMTP_USER/PASS)' });
  } catch (err) {
    console.error('[messageEmail] LỖI gửi email:', err.message);
    return { sent: false, reason: 'error' };
  }
}

/**
 * Email đặt lại mật khẩu: chứa link có token (hết hạn sau N phút) dẫn tới trang
 * /reset-password của frontend. Template tiếng Việt, tái dùng sendNotificationEmail.
 */
export async function sendPasswordResetEmail({ to, recipientName, resetUrl, expiresMinutes = 30 }) {
  const safeName = escapeHtml(recipientName || 'bạn');
  const safeUrl = escapeHtml(resetUrl);
  const subject = '🔐 AdvisorHub — Đặt lại mật khẩu';

  const html = `
  <div style="max-width:600px; margin:0 auto; font-family:Arial,Helvetica,sans-serif; color:#0f172a;">
    <div style="background:#1d4ed8; color:#ffffff; padding:18px 22px; border-radius:10px 10px 0 0;">
      <h2 style="margin:0; font-size:18px;">🎓 AdvisorHub — Đặt lại mật khẩu</h2>
    </div>
    <div style="border:1px solid #e2e8f0; border-top:none; padding:22px; border-radius:0 0 10px 10px;">
      <p style="margin-top:0;">Chào <strong>${safeName}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản AdvisorHub của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:</p>
      <p style="text-align:center; margin:28px 0;">
        <a href="${safeUrl}" style="display:inline-block; background:#1d4ed8; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 28px; border-radius:10px;">Đặt lại mật khẩu</a>
      </p>
      <p style="color:#64748b; font-size:13px;">Hoặc sao chép liên kết sau vào trình duyệt:<br>
        <span style="word-break:break-all; color:#1d4ed8;">${safeUrl}</span>
      </p>
      <p style="color:#64748b; font-size:13px;">Liên kết sẽ hết hạn sau <strong>${expiresMinutes} phút</strong> và chỉ dùng được một lần.</p>
      <p style="font-size:12px; color:#94a3b8; margin-top:20px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn. Email được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>`;

  const text = [
    `Chào ${recipientName || 'bạn'},`,
    'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản AdvisorHub của bạn.',
    'Mở liên kết sau để tạo mật khẩu mới:',
    resetUrl,
    '',
    `Liên kết sẽ hết hạn sau ${expiresMinutes} phút và chỉ dùng được một lần.`,
    'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.',
  ].join('\n');

  return sendNotificationEmail({ to, subject, text, html });
}

const APPOINTMENT_ACTION_LABELS = {
  requested: 'Yêu cầu đặt lịch mới',
  created: 'Lịch tư vấn mới',
  confirmed: 'Lịch tư vấn đã được xác nhận',
  cancelled: 'Lịch tư vấn đã bị từ chối hoặc hủy',
  updated: 'Lịch tư vấn đã được cập nhật',
};

export async function sendAppointmentEmail({
  to,
  recipientName,
  actorName,
  action,
  appointment,
}) {
  const label = APPOINTMENT_ACTION_LABELS[action] || APPOINTMENT_ACTION_LABELS.updated;
  const startTime = appointment?.start_time
    ? new Date(appointment.start_time).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : 'Chưa xác định';
  const title = appointment?.title || 'Lịch tư vấn';
  const subject = `[AdvisorHub] ${label}: ${title}`;

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
      <div style="background:#1d4ed8;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
        <h2 style="margin:0;font-size:18px">AdvisorHub — Thông báo lịch tư vấn</h2>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:22px;border-radius:0 0 10px 10px">
        <p>Chào <strong>${escapeHtml(recipientName || 'bạn')}</strong>,</p>
        <p><strong>${escapeHtml(actorName || 'AdvisorHub')}</strong>: ${escapeHtml(label.toLowerCase())}.</p>
        <div style="padding:14px;background:#f8fafc;border-radius:8px">
          <div><strong>Nội dung:</strong> ${escapeHtml(title)}</div>
          <div style="margin-top:6px"><strong>Thời gian:</strong> ${escapeHtml(startTime)}</div>
          ${appointment?.location ? `<div style="margin-top:6px"><strong>Địa điểm:</strong> ${escapeHtml(appointment.location)}</div>` : ''}
          ${appointment?.note ? `<div style="margin-top:6px"><strong>Ghi chú:</strong> ${escapeHtml(appointment.note)}</div>` : ''}
        </div>
        <p>Vui lòng đăng nhập AdvisorHub để xem chi tiết.</p>
        <p style="font-size:12px;color:#94a3b8">Email được gửi tự động, vui lòng không trả lời.</p>
      </div>
    </div>`;

  const text = [
    `Chào ${recipientName || 'bạn'},`,
    `${actorName || 'AdvisorHub'}: ${label.toLowerCase()}.`,
    `Nội dung: ${title}`,
    `Thời gian: ${startTime}`,
    appointment?.location ? `Địa điểm: ${appointment.location}` : '',
    appointment?.note ? `Ghi chú: ${appointment.note}` : '',
    'Vui lòng đăng nhập AdvisorHub để xem chi tiết.',
  ].filter(Boolean).join('\n');

  return sendNotificationEmail({ to, subject, text, html });
}

export async function notifyAppointmentByEmail({
  recipientUserId,
  actorUserId,
  action,
  appointment,
}) {
  try {
    const ids = [Number(recipientUserId), Number(actorUserId)].filter(Number.isFinite);
    const people = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         COALESCE(NULLIF(u.email, ''), NULLIF(s.email, '')) AS email,
         s.mssv
       FROM users u
       LEFT JOIN students s ON s.id = u.student_id
       WHERE u.id = ANY($1::int[])`,
      [ids]
    );
    const recipient = people.rows.find((row) => Number(row.id) === Number(recipientUserId));
    const actor = people.rows.find((row) => Number(row.id) === Number(actorUserId));
    if (!recipient) return { sent: false, skipped: true, reason: 'recipient_not_found' };

    const to = recipient.mssv ? studentEmail(recipient.mssv) : recipient.email;
    if (!to) return { sent: false, skipped: true, reason: 'missing_recipient_email' };

    return await sendAppointmentEmail({
      to,
      recipientName: recipient.full_name,
      actorName: actor?.full_name,
      action,
      appointment,
    });
  } catch (err) {
    console.error('[appointmentEmail] Lỗi gửi email:', err.message);
    return { sent: false, skipped: true, reason: 'error' };
  }
}

export async function sendNotificationEmail({ to, subject, text, html }) {
  if (!to) {
    return { sent: false, skipped: true, reason: 'missing_recipient' };
  }

  // Ưu tiên email API qua HTTPS 443 khi có cấu hình — tránh việc host chặn cổng SMTP.
  // Gmail API đứng đầu: gửi "từ" gmail hợp lệ DMARC → vào Inbox.
  if (config.gmailApi.clientId && config.gmailApi.clientSecret && config.gmailApi.refreshToken) {
    return sendViaGmailApi({ to, subject, text, html });
  }
  if (config.smtp2go.apiKey) {
    return sendViaSmtp2go({ to, subject, text, html });
  }
  if (config.brevo.apiKey) {
    return sendViaBrevo({ to, subject, text, html });
  }

  // Fallback: SMTP (vd Gmail) — phù hợp chạy local.
  if (!isEmailConfigured()) {
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const transporter = await createMailTransport();

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text: text || stripHtml(html),
    html,
  });

  return { sent: true, skipped: false };
}
