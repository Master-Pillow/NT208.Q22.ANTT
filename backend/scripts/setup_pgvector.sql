-- backend/scripts/setup_pgvector.sql
-- Chạy file này trong pgAdmin hoặc psql để cài đặt pgvector
-- Chỉ cần chạy MỘT LẦN DUY NHẤT

-- Bước 1: Kích hoạt extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Bước 2: Tạo bảng lưu chunks kiến thức + vectors
CREATE TABLE IF NOT EXISTS uit_knowledge_chunks (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(768),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Bước 3: Tạo bảng cache để tiết kiệm quota Gemini
CREATE TABLE IF NOT EXISTS uit_faq_cache (
    question_hash   TEXT PRIMARY KEY,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    sources         JSONB,
    hit_count       INTEGER DEFAULT 1,
    created_at      TIMESTAMP DEFAULT NOW(),
    last_used_at    TIMESTAMP DEFAULT NOW()
);

-- Bước 4: Tạo index HNSW để tìm kiếm vector nhanh (chạy sau khi đã import data)
-- (Chạy dòng này SAU KHI đã chạy importChunks.js)
-- CREATE INDEX ON uit_knowledge_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Kiểm tra
SELECT 'pgvector version: ' || extversion FROM pg_extension WHERE extname = 'vector';
SELECT 'Bảng uit_knowledge_chunks đã tạo thành công!' AS status;
SELECT 'Bảng uit_faq_cache đã tạo thành công!' AS status;
