import nodemailer from 'nodemailer';
import { config } from '../config.js';

function isEmailConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.from);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
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
