// backend/scripts/importChunks.js
// Chạy: node backend/scripts/importChunks.js
// Chạy SAU KHI đã có file chunks_with_embeddings.json từ Google Colab

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function importChunks() {
  const filePath = path.join(__dirname, 'chunks_with_embeddings.json');

  if (!fs.existsSync(filePath)) {
    console.error('❌ Không tìm thấy chunks_with_embeddings.json!');
    console.error('   Hãy chạy Google Colab trước để tạo file này.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`📦 Đang import ${data.length} chunks vào PostgreSQL...`);

  let success = 0;
  let failed = 0;

  for (const chunk of data) {
    try {
      const vectorStr = `[${chunk.embedding.join(',')}]`;

      await pool.query(`
        INSERT INTO uit_knowledge_chunks (id, category, content, embedding)
        VALUES ($1, $2, $3, $4::vector)
        ON CONFLICT (id) DO UPDATE SET
          content   = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          created_at = NOW()
      `, [chunk.id, chunk.category, chunk.content, vectorStr]);

      success++;
      process.stdout.write(`\r✅ ${success}/${data.length} chunks imported...`);
    } catch (err) {
      console.error(`\n❌ Lỗi chunk "${chunk.id}":`, err.message);
      failed++;
    }
  }

  console.log(`\n\n🎉 Import hoàn tất! Thành công: ${success} | Thất bại: ${failed}`);

  // Tạo index HNSW sau khi import xong
  console.log('\n📐 Đang tạo HNSW index để tăng tốc tìm kiếm...');
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS uit_chunks_embedding_idx
      ON uit_knowledge_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
    console.log('✅ Index HNSW đã tạo thành công!');
  } catch (err) {
    console.warn('⚠️  Không tạo được index (có thể đã tồn tại):', err.message);
  }

  // Kiểm tra kết quả
  const count = await pool.query('SELECT COUNT(*) FROM uit_knowledge_chunks');
  console.log(`\n📊 Tổng số chunks trong DB: ${count.rows[0].count}`);

  process.exit(0);
}

importChunks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
