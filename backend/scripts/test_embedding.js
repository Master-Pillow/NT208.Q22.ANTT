// backend/scripts/test_embedding.js
// Kiểm tra nhanh embedding model với GEMINI_API_KEY trong backend/.env.
// Chạy: node scripts/test_embedding.js  (từ thư mục backend)

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  console.error('❌ Không tìm thấy GEMINI_API_KEY trong backend/.env');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

async function testEmbedding() {
  console.log('Testing text-embedding-004...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text: 'Hello' }] },
    }),
  });

  console.log('Status:', res.status);
  const data = await res.text();
  console.log('Response:', data.substring(0, 200));
}

testEmbedding();
