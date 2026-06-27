-- Optional migration for the student DAA grade synchronization feature.
-- The backend also creates these objects lazily during synchronization.

CREATE TABLE IF NOT EXISTS student_grade_imports (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mssv VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'uit-daa-session',
  raw_payload JSONB NOT NULL,
  normalized_payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IMPORTED', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_at TIMESTAMPTZ
);

ALTER TABLE grades
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'GRADED'
    CHECK (status IN ('GRADED', 'IN_PROGRESS', 'ABSENT'));

ALTER TABLE grades ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS source_hash VARCHAR(64);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
