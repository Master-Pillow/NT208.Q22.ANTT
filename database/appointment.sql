CREATE TABLE appointments (
  id           BIGSERIAL PRIMARY KEY,
  advisor_id   BIGINT NOT NULL REFERENCES users(id),
  student_id   BIGINT REFERENCES students(id),
  title        VARCHAR(255) NOT NULL,
  location     VARCHAR(255),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  type         VARCHAR(50) DEFAULT 'MEETING',
  status       VARCHAR(20) DEFAULT 'confirmed',
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON appointments(advisor_id, start_time);