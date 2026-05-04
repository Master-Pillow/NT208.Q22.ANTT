-- Bảng conversations (Cuộc hội thoại giữa 1 Cố vấn và 1 Sinh viên)
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  advisor_id INT NOT NULL REFERENCES users(id),
  student_id INT NOT NULL REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advisor_id, student_id)
);

-- Bảng messages (Chi tiết từng tin nhắn)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL, -- Sẽ là 'ADVISOR' hoặc 'STUDENT'
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);