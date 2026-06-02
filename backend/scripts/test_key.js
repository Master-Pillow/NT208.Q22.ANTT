// backend/scripts/test_key.js
// Kiểm tra nhanh GEMINI_API_KEY trong backend/.env còn hoạt động không.
// Chạy: node scripts/test_key.js  (từ thư mục backend)

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.error('❌ Không tìm thấy GEMINI_API_KEY trong backend/.env');
  console.error('   → Tạo key tại https://aistudio.google.com/app/apikey rồi dán vào backend/.env');
  process.exit(1);
}

const model = 'gemini-2.5-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

async function testKey() {
  console.log(`Đang kiểm tra ${model}... (key: ${apiKey.slice(0, 6)}…${apiKey.slice(-4)})`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
    });

    console.log('Status:', res.status);
    if (res.ok) {
      console.log('✅ Key hợp lệ — chatbox sẵn sàng hoạt động.');
    } else {
      const data = await res.text();
      console.error('❌ Key lỗi. Phản hồi:', data);
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối:', err.message);
  }
}

testKey();
