import nodemailer from 'nodemailer';
import { config } from '../config.js';

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
