-- =====================================================================
-- UIT AdvisorHub - Full Database Schema + Seed
-- Includes: ADMIN, ADVISOR, STUDENT roles; students; grades;
-- conversations/messages; appointments; notifications/warnings.
--
-- Demo passwords are plain text 'password123' to match the current
-- backend login implementation that compares password === password_hash.
-- If you switch backend to bcrypt.compare(), replace these values with
-- bcrypt hashes.
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

BEGIN;

-- ===============================================================
-- 1) MASTER DATA TABLES
-- ===============================================================

CREATE TABLE admin_classes (
    code    VARCHAR(50) PRIMARY KEY,
    name    VARCHAR(255) NOT NULL,
    cohort  VARCHAR(50) NOT NULL,
    program VARCHAR(255) NOT NULL
);

CREATE TABLE students (
    id         BIGSERIAL PRIMARY KEY,
    mssv       VARCHAR(50) UNIQUE NOT NULL,
    full_name  VARCHAR(255) NOT NULL,
    email      VARCHAR(255) UNIQUE,
    phone      VARCHAR(30),
    class_code VARCHAR(50) REFERENCES admin_classes(code) ON DELETE SET NULL,
    cohort     VARCHAR(50),
    status     VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'AT_RISK', 'SUSPENDED', 'GRADUATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ADVISOR', 'STUDENT')),
    student_id    BIGINT UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    bio           TEXT,
    avatar_url    TEXT,
    cover_url     TEXT,
    message_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(50) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    credits    INT NOT NULL CHECK (credits > 0),
    department VARCHAR(50)
);

CREATE TABLE advisor_class (
    advisor_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_code VARCHAR(50) NOT NULL REFERENCES admin_classes(code) ON DELETE CASCADE,
    PRIMARY KEY (advisor_id, class_code)
);

CREATE TABLE enrollments (
    id         BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id  BIGINT NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
    semester   VARCHAR(20) NOT NULL,
    UNIQUE (student_id, course_id, semester)
);

CREATE TABLE grades (
    enrollment_id BIGINT PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
    letter_grade  VARCHAR(5) CHECK (letter_grade IN ('A', 'B', 'C', 'D', 'F')),
    numeric_grade NUMERIC(5,2),
    gpa_points    NUMERIC(3,2) CHECK (gpa_points >= 0 AND gpa_points <= 4)
);

-- ===============================================================
-- 2) ADVISING / COMMUNICATION TABLES
-- ===============================================================

CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advisor_id, student_id)
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('ADVISOR', 'STUDENT')),
  sender_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Hệ direct-message tổng quát user↔user (dùng cho sinh viên ↔ sinh viên cùng lớp;
-- mở rộng được cho mọi cặp user). user_a_id < user_b_id để 1 cặp chỉ có 1 thread.
CREATE TABLE dm_threads (
  id BIGSERIAL PRIMARY KEY,
  user_a_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a_id < user_b_id),
  UNIQUE (user_a_id, user_b_id)
);

CREATE TABLE dm_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Tuỳ chọn email tin nhắn theo từng cặp (mute) + mốc throttle. Khoá theo cặp user
-- nên dùng chung cho cả hệ advisor↔student lẫn dm sinh viên↔sinh viên.
CREATE TABLE message_notif_prefs (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted        BOOLEAN NOT NULL DEFAULT FALSE,
  last_emailed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, peer_user_id)
);

CREATE TABLE appointments (
  id           BIGSERIAL PRIMARY KEY,
  advisor_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id   BIGINT REFERENCES students(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  location     VARCHAR(255),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  type         VARCHAR(50) DEFAULT 'MEETING'
    CHECK (type IN ('MEETING', 'ONLINE', 'PHONE', 'FOLLOW_UP')),
  status       VARCHAR(20) DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'INFO'
    CHECK (type IN ('INFO', 'MESSAGE', 'WARNING', 'APPOINTMENT', 'SYSTEM')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE advising_logs (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    advisor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason          VARCHAR(255),
    action_plan     VARCHAR(255),
    note            TEXT
);

-- Extra alert table for academic warnings. Frontend can use notifications
-- directly, but this table keeps structured warning history.
CREATE TABLE student_alerts (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    advisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
      CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
      CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ===============================================================
-- 3) INDEXES
-- ===============================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_students_class_code ON students(class_code);
CREATE INDEX idx_advisor_class_advisor ON advisor_class(advisor_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_conversations_advisor ON conversations(advisor_id);
CREATE INDEX idx_conversations_student ON conversations(student_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_dm_messages_thread_created ON dm_messages(thread_id, created_at);
CREATE INDEX idx_appointments_advisor_start ON appointments(advisor_id, start_time);
CREATE INDEX idx_appointments_student_start ON appointments(student_id, start_time);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_student_alerts_student_status ON student_alerts(student_id, status);

-- ===============================================================
-- 4) SEED CLASSES
-- ===============================================================

INSERT INTO admin_classes (code, name, cohort, program) VALUES
('CS2023A',   'Khoa học Máy tính 2023 - Lớp A',            '2023', 'Computer Science'),
('CS2023B',   'Khoa học Máy tính 2023 - Lớp B',            '2023', 'Computer Science'),
('SE2022A',   'Kỹ thuật Phần mềm 2022 - Lớp A',            '2022', 'Software Engineering'),
('SE2022B',   'Kỹ thuật Phần mềm 2022 - Lớp B',            '2022', 'Software Engineering'),
('AI2024A',   'Trí tuệ Nhân tạo 2024 - Lớp A',             '2024', 'Artificial Intelligence'),
('AI2024B',   'Trí tuệ Nhân tạo 2024 - Lớp B',             '2024', 'Artificial Intelligence'),
('IT2023A',   'Công nghệ Thông tin 2023 - Lớp A',          '2023', 'Information Technology'),
('IT2023B',   'Công nghệ Thông tin 2023 - Lớp B',          '2023', 'Information Technology'),
('NT2022A',   'Mạng Máy tính và Truyền thông 2022 - Lớp A','2022', 'Network & Communications'),
('NT2022B',   'Mạng Máy tính và Truyền thông 2022 - Lớp B','2022', 'Network & Communications'),
('DS2024A',   'Khoa học Dữ liệu 2024 - Lớp A',             '2024', 'Data Science');

-- ===============================================================
-- 5) SEED STUDENTS (~308 hồ sơ sinh viên)
-- ===============================================================

DO $$
DECLARE
  last_names TEXT[] := ARRAY[
    'Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ',
    'Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Lưu','Cao','Tô'
  ];
  mid_male   TEXT[] := ARRAY['Văn','Quốc','Minh','Hữu','Đức','Công','Thành','Bảo','Gia','Tiến'];
  mid_female TEXT[] := ARRAY['Thị','Ngọc','Kim','Thanh','Hồng','Phương','Thu','Ánh','Tuyết','Mai'];
  first_male   TEXT[] := ARRAY['An','Bình','Cường','Dũng','Giang','Hải','Khoa','Long','Nam','Phúc','Quân','Sơn','Thắng','Trung','Tuấn','Việt','Đạt','Hưng','Khải','Lâm'];
  first_female TEXT[] := ARRAY['Anh','Châu','Dung','Hà','Hương','Lan','Linh','Mai','Nga','Nhi','Oanh','Phương','Thảo','Thùy','Trang','Trinh','Uyên','Vân','Xuân','Yến'];
  class_configs RECORD;
  i INT;
  student_id INT := 1;
  is_female BOOLEAN;
  s_last TEXT;
  s_mid TEXT;
  s_first TEXT;
  full_name TEXT;
  mssv TEXT;
  email TEXT;
BEGIN
  FOR class_configs IN
    SELECT code, cohort,
      CASE cohort
        WHEN '2022' THEN '22521'
        WHEN '2023' THEN '23521'
        WHEN '2024' THEN '24521'
        ELSE '23521'
      END AS prefix,
      CASE code
        WHEN 'CS2023A' THEN 30 WHEN 'CS2023B' THEN 28
        WHEN 'SE2022A' THEN 30 WHEN 'SE2022B' THEN 28
        WHEN 'AI2024A' THEN 28 WHEN 'AI2024B' THEN 26
        WHEN 'IT2023A' THEN 30 WHEN 'IT2023B' THEN 28
        WHEN 'NT2022A' THEN 28 WHEN 'NT2022B' THEN 26
        WHEN 'DS2024A' THEN 26 ELSE 25
      END AS student_count
    FROM admin_classes
    ORDER BY code
  LOOP
    FOR i IN 1..class_configs.student_count LOOP
      is_female := (random() > 0.52);
      s_last := last_names[1 + floor(random() * array_length(last_names, 1))::int];

      IF is_female THEN
        s_mid := mid_female[1 + floor(random() * array_length(mid_female, 1))::int];
        s_first := first_female[1 + floor(random() * array_length(first_female, 1))::int];
      ELSE
        s_mid := mid_male[1 + floor(random() * array_length(mid_male, 1))::int];
        s_first := first_male[1 + floor(random() * array_length(first_male, 1))::int];
      END IF;

      full_name := s_last || ' ' || s_mid || ' ' || s_first;
      mssv := class_configs.prefix || lpad(student_id::text, 3, '0');
      email := lower(mssv || '@gm.uit.edu.vn');

      INSERT INTO students (id, full_name, mssv, email, phone, class_code, cohort, status)
      VALUES (
        student_id,
        full_name,
        mssv,
        email,
        '09' || lpad((10000000 + student_id)::text, 8, '0'),
        class_configs.code,
        class_configs.cohort,
        CASE WHEN student_id % 11 = 0 THEN 'AT_RISK' ELSE 'ACTIVE' END
      );

      student_id := student_id + 1;
    END LOOP;
  END LOOP;
END $$;

SELECT setval('students_id_seq', (SELECT MAX(id) FROM students), true);

-- ===============================================================
-- 6) SEED USERS: ADMIN, ADVISOR, STUDENT
-- ===============================================================
-- Password for every demo account below: password123

INSERT INTO users (id, email, password_hash, full_name, role, student_id) VALUES
(1, 'admin@uit.edu.vn',          'password123', 'Quản trị viên hệ thống', 'ADMIN', NULL),
(2, 'thornea@uit.edu.vn',        'password123', 'Dr. Aris Thorne',       'ADVISOR', NULL),
(3, 'minhnv@uit.edu.vn',         'password123', 'TS. Nguyễn Văn Minh',   'ADVISOR', NULL),
(4, 'thult@uit.edu.vn',          'password123', 'ThS. Lê Thị Thu',       'ADVISOR', NULL),
(5, 'hungpq@uit.edu.vn',         'password123', 'TS. Phạm Quốc Hùng',    'ADVISOR', NULL),
(6, 'lantrn@uit.edu.vn',         'password123', 'ThS. Trần Ngọc Lan',    'ADVISOR', NULL);

-- Tài khoản sinh viên test: lấy 8 sinh viên đầu tiên trong bảng students.
INSERT INTO users (id, email, password_hash, full_name, role, student_id)
SELECT 1000 + s.id,
       s.mssv || '@gm.uit.edu.vn',
       'password123',
       s.full_name,
       'STUDENT',
       s.id
FROM students s
WHERE s.id BETWEEN 1 AND 8
ORDER BY s.id;

SELECT setval('users_id_seq', 2000, true);

-- ===============================================================
-- 7) SEED ADVISOR -> CLASS ASSIGNMENTS
-- ===============================================================

INSERT INTO advisor_class (advisor_id, class_code) VALUES
(2, 'CS2023A'), (2, 'CS2023B'), (2, 'IT2023A'),
(3, 'SE2022A'), (3, 'SE2022B'),
(4, 'AI2024A'), (4, 'AI2024B'), (4, 'DS2024A'),
(5, 'NT2022A'), (5, 'NT2022B'),
(6, 'IT2023B');

-- ===============================================================
-- 8) SEED COURSES
-- ===============================================================

INSERT INTO courses (id, code, name, credits, department) VALUES
(1,  'IT001',  'Nhập môn Lập trình',                       3, 'IT'),
(2,  'IT002',  'Lập trình hướng đối tượng',                3, 'IT'),
(3,  'IT003',  'Cấu trúc dữ liệu và Giải thuật',           3, 'IT'),
(4,  'IT004',  'Hệ điều hành',                             3, 'IT'),
(5,  'IT005',  'Cơ sở dữ liệu',                            3, 'IT'),
(6,  'IT006',  'Trí tuệ nhân tạo',                         3, 'IT'),
(7,  'NT101',  'Mạng máy tính',                            3, 'NET'),
(8,  'NT201',  'An ninh mạng',                             3, 'NET'),
(9,  'MA001',  'Giải tích',                                3, 'MATH'),
(10, 'MA003',  'Xác suất thống kê',                        3, 'MATH'),
(11, 'MA006',  'Toán rời rạc',                             3, 'MATH'),
(12, 'MA007',  'Đại số tuyến tính',                        3, 'MATH'),
(13, 'SE301',  'Công nghệ phần mềm',                       3, 'SE'),
(14, 'SE302',  'Kiến trúc phần mềm',                       3, 'SE'),
(15, 'SE401',  'Kiểm thử phần mềm',                        2, 'SE'),
(16, 'AI101',  'Học máy',                                  3, 'AI'),
(17, 'AI102',  'Xử lý ngôn ngữ tự nhiên',                  3, 'AI'),
(18, 'DS101',  'Phân tích và Trực quan hóa dữ liệu',        3, 'DS');

SELECT setval('courses_id_seq', 20, true);

-- ===============================================================
-- 9) SEED ENROLLMENTS
-- ===============================================================

DO $$
DECLARE
  cs_courses INT[] := ARRAY[1,2,3,4,5,9,10,11,12,13];
  se_courses INT[] := ARRAY[2,3,4,5,10,11,13,14,15,7];
  ai_courses INT[] := ARRAY[2,3,5,6,10,11,12,16,17,18];
  it_courses INT[] := ARRAY[1,2,3,4,5,7,9,10,11,13];
  nt_courses INT[] := ARRAY[1,2,4,7,8,9,10,11,12,13];
  ds_courses INT[] := ARRAY[2,3,5,6,10,11,12,16,18,9];
  s RECORD;
  course_pool INT[];
  num_courses INT;
  enrolled_cnt INT;
  course_id INT;
  enr_id INT := 1;
  sem TEXT;
  already_enrolled INT[];
BEGIN
  FOR s IN SELECT id, class_code, cohort FROM students ORDER BY id LOOP
    course_pool := CASE
      WHEN s.class_code LIKE 'CS%' THEN cs_courses
      WHEN s.class_code LIKE 'SE%' THEN se_courses
      WHEN s.class_code LIKE 'AI%' THEN ai_courses
      WHEN s.class_code LIKE 'IT%' THEN it_courses
      WHEN s.class_code LIKE 'NT%' THEN nt_courses
      WHEN s.class_code LIKE 'DS%' THEN ds_courses
      ELSE cs_courses
    END;

    num_courses := 7 + floor(random() * 3)::int;
    enrolled_cnt := 0;
    already_enrolled := ARRAY[]::INT[];

    WHILE enrolled_cnt < num_courses LOOP
      course_id := course_pool[1 + floor(random() * array_length(course_pool, 1))::int];

      IF course_id = ANY(already_enrolled) THEN
        CONTINUE;
      END IF;

      already_enrolled := array_append(already_enrolled, course_id);

      sem := CASE
        WHEN s.cohort = '2022' THEN (ARRAY['HK1-2022','HK2-2022','HK1-2023','HK2-2023'])[1 + floor(random()*4)::int]
        WHEN s.cohort = '2023' THEN (ARRAY['HK1-2023','HK2-2023','HK1-2024'])[1 + floor(random()*3)::int]
        ELSE (ARRAY['HK1-2024','HK2-2024'])[1 + floor(random()*2)::int]
      END;

      INSERT INTO enrollments (id, student_id, course_id, semester)
      VALUES (enr_id, s.id, course_id, sem);

      enr_id := enr_id + 1;
      enrolled_cnt := enrolled_cnt + 1;
    END LOOP;
  END LOOP;
END $$;

SELECT setval('enrollments_id_seq', (SELECT MAX(id) FROM enrollments), true);

-- ===============================================================
-- 10) SEED GRADES
-- ===============================================================

DO $$
DECLARE
  e RECORD;
  r FLOAT;
  lgrade TEXT;
  gpa_pts NUMERIC(3,2);
  ngrade NUMERIC(5,2);
  killer_ids INT[] := ARRAY[2, 3, 7, 10, 11];
BEGIN
  FOR e IN SELECT id, course_id FROM enrollments ORDER BY id LOOP
    r := random();

    IF e.course_id = ANY(killer_ids) THEN
      lgrade := CASE
        WHEN r < 0.15 THEN 'A'
        WHEN r < 0.37 THEN 'B'
        WHEN r < 0.60 THEN 'C'
        WHEN r < 0.78 THEN 'D'
        ELSE 'F'
      END;
    ELSE
      lgrade := CASE
        WHEN r < 0.20 THEN 'A'
        WHEN r < 0.55 THEN 'B'
        WHEN r < 0.83 THEN 'C'
        WHEN r < 0.93 THEN 'D'
        ELSE 'F'
      END;
    END IF;

    gpa_pts := CASE lgrade
      WHEN 'A' THEN 4.00
      WHEN 'B' THEN 3.00
      WHEN 'C' THEN 2.00
      WHEN 'D' THEN 1.00
      ELSE 0.00
    END;

    ngrade := CASE lgrade
      WHEN 'A' THEN round((8.5 + random() * 1.5)::numeric, 2)
      WHEN 'B' THEN round((7.0 + random() * 1.4)::numeric, 2)
      WHEN 'C' THEN round((5.5 + random() * 1.4)::numeric, 2)
      WHEN 'D' THEN round((4.0 + random() * 1.4)::numeric, 2)
      ELSE round((0.0 + random() * 3.9)::numeric, 2)
    END;

    INSERT INTO grades (enrollment_id, letter_grade, numeric_grade, gpa_points)
    VALUES (e.id, lgrade, ngrade, gpa_pts);
  END LOOP;
END $$;

-- ===============================================================
-- 11) SEED DEMO MESSAGES, APPOINTMENTS, NOTIFICATIONS, WARNINGS
-- ===============================================================

-- Conversations for 5 test students with advisor Aris Thorne.
INSERT INTO conversations (advisor_id, student_id)
SELECT 2, s.id
FROM students s
WHERE s.id BETWEEN 1 AND 5;

INSERT INTO messages (conversation_id, sender_role, sender_id, content, is_read, created_at)
SELECT c.id, 'ADVISOR', 2,
       'Chào em, thầy/cô đã xem tình hình học tập của em. Em nên đặt lịch tư vấn để trao đổi kế hoạch học kỳ tới.',
       TRUE, NOW() - INTERVAL '2 days'
FROM conversations c
WHERE c.advisor_id = 2 AND c.student_id BETWEEN 1 AND 5;

INSERT INTO messages (conversation_id, sender_role, sender_id, content, is_read, created_at)
SELECT c.id, 'STUDENT', u.id,
       'Dạ em muốn đặt lịch gặp cố vấn để trao đổi thêm ạ.',
       FALSE, NOW() - INTERVAL '1 day'
FROM conversations c
JOIN users u ON u.student_id = c.student_id
WHERE c.advisor_id = 2 AND c.student_id BETWEEN 1 AND 5;

-- Appointments: pending/confirmed/completed samples.
INSERT INTO appointments (advisor_id, student_id, title, location, start_time, end_time, type, status, note) VALUES
(2, 1, 'Tư vấn kế hoạch học tập', 'Phòng C.204', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 30 minutes', 'MEETING', 'confirmed', 'Trao đổi về tín chỉ nợ và kế hoạch cải thiện GPA.'),
(2, 2, 'Trao đổi về môn học rủi ro', 'Google Meet', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 30 minutes', 'ONLINE', 'pending', 'Sinh viên cần hỗ trợ môn cấu trúc dữ liệu.'),
(3, 59, 'Tư vấn đăng ký học phần', 'Phòng B.105', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 45 minutes', 'MEETING', 'confirmed', 'Kiểm tra học phần thay thế.'),
(4, 117, 'Theo dõi tiến độ học tập', 'Google Meet', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes', 'ONLINE', 'completed', 'Đã tư vấn xong và ghi nhận kế hoạch.'),
(5, 250, 'Cảnh báo học vụ', 'Phòng A.301', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 30 minutes', 'MEETING', 'confirmed', 'Sinh viên có nguy cơ nợ tín chỉ cao.');

-- Notifications for student accounts.
INSERT INTO notifications (user_id, title, content, type, is_read)
SELECT u.id, 'Tin nhắn mới từ cố vấn', 'Bạn có tin nhắn mới từ cố vấn học tập.', 'MESSAGE', FALSE
FROM users u
WHERE u.role = 'STUDENT' AND u.student_id BETWEEN 1 AND 5;

INSERT INTO notifications (user_id, title, content, type, is_read)
SELECT u.id, 'Cảnh báo học vụ', 'Bạn đang có tín chỉ nợ hoặc GPA thấp. Vui lòng kiểm tra kế hoạch học tập.', 'WARNING', FALSE
FROM users u
WHERE u.role = 'STUDENT' AND u.student_id IN (1, 3, 5);

INSERT INTO notifications (user_id, title, content, type, is_read)
SELECT u.id, 'Lịch tư vấn đã được tạo', 'Bạn có lịch tư vấn mới với cố vấn học tập.', 'APPOINTMENT', FALSE
FROM users u
WHERE u.role = 'STUDENT' AND u.student_id IN (1, 2);

-- Advisor notifications.
INSERT INTO notifications (user_id, title, content, type, is_read) VALUES
(2, 'Sinh viên đặt lịch mới', 'Có sinh viên vừa gửi yêu cầu tư vấn học tập.', 'APPOINTMENT', FALSE),
(2, 'Tin nhắn sinh viên', 'Bạn có tin nhắn mới từ sinh viên cần hỗ trợ.', 'MESSAGE', FALSE),
(1, 'Hệ thống đã khởi tạo', 'Dữ liệu demo đã sẵn sàng với ADMIN, ADVISOR và STUDENT.', 'SYSTEM', FALSE);

-- Structured alerts + advising logs.
INSERT INTO student_alerts (student_id, advisor_id, severity, title, description, status) VALUES
(1, 2, 'HIGH', 'Nguy cơ nợ tín chỉ cao', 'Sinh viên có nhiều môn điểm thấp, cần lập kế hoạch cải thiện.', 'OPEN'),
(3, 2, 'MEDIUM', 'GPA giảm trong học kỳ gần đây', 'Cần theo dõi tiến độ học tập và tư vấn học phần.', 'OPEN'),
(5, 2, 'HIGH', 'Cảnh báo môn học rủi ro', 'Sinh viên có điểm F ở môn thuộc nhóm rủi ro cao.', 'OPEN');

INSERT INTO advising_logs (student_id, advisor_user_id, reason, action_plan, note) VALUES
(1, 2, 'Nợ tín chỉ cao', 'Đặt lịch tư vấn và rà soát học phần cần học lại', 'Sinh viên cần ưu tiên các môn bắt buộc.'),
(3, 2, 'GPA thấp', 'Theo dõi 4 tuần và đề xuất nhóm học tập', 'Khuyến nghị gặp cố vấn trước kỳ đăng ký môn.'),
(5, 2, 'Môn học rủi ro', 'Lập kế hoạch học lại và giảm tải học kỳ tới', 'Cần kiểm tra điều kiện tiên quyết.');

-- ===============================================================
-- 12) HELPER VIEWS FOR DASHBOARD / REPORTING
-- ===============================================================

CREATE OR REPLACE VIEW student_academic_summary AS
SELECT
  s.id AS student_id,
  s.mssv,
  s.full_name,
  s.class_code,
  s.cohort,
  COALESCE(ROUND(SUM(g.gpa_points * c.credits) / NULLIF(SUM(c.credits), 0), 2), 0) AS current_gpa,
  COALESCE(SUM(CASE WHEN g.letter_grade = 'F' THEN c.credits ELSE 0 END), 0) AS credit_debt,
  COUNT(*) FILTER (WHERE g.letter_grade = 'F') AS failed_subjects
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id
LEFT JOIN courses c ON c.id = e.course_id
LEFT JOIN grades g ON g.enrollment_id = e.id
GROUP BY s.id, s.mssv, s.full_name, s.class_code, s.cohort;

CREATE OR REPLACE VIEW advisor_student_scope AS
SELECT
  u.id AS advisor_id,
  u.full_name AS advisor_name,
  ac.class_code,
  s.id AS student_id,
  s.mssv,
  s.full_name AS student_name
FROM users u
JOIN advisor_class ac ON ac.advisor_id = u.id
JOIN students s ON s.class_code = ac.class_code
WHERE u.role = 'ADVISOR';

COMMIT;
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  content    TEXT,
  type       VARCHAR(50) DEFAULT 'INFO',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng đánh giá advisor
CREATE TABLE advisor_evaluations (
  id              BIGSERIAL PRIMARY KEY,
  advisor_id      BIGINT NOT NULL REFERENCES users(id),
  semester        VARCHAR(20),
  avg_student_gpa NUMERIC(4,2),
  at_risk_count   INT DEFAULT 0,
  total_students  INT DEFAULT 0,
  score           NUMERIC(4,2),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
BEGIN;

CREATE TABLE IF NOT EXISTS ai_anomaly_runs (
  id BIGSERIAL PRIMARY KEY,
  run_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL'
    CHECK (run_type IN ('MANUAL', 'GRADE_UPDATE', 'SCHEDULED')),
  status VARCHAR(30) NOT NULL DEFAULT 'RUNNING'
    CHECK (status IN ('RUNNING', 'DONE', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  summary_json JSONB,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS ai_student_anomalies (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  advisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  anomaly_type VARCHAR(60) NOT NULL,
  course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_action TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_student_anomalies_student_status
  ON ai_student_anomalies(student_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_student_anomalies_advisor_created
  ON ai_student_anomalies(advisor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_student_anomalies_type_course
  ON ai_student_anomalies(anomaly_type, course_id);

CREATE TABLE IF NOT EXISTS ai_anomaly_patterns (
  id BIGSERIAL PRIMARY KEY,
  source_course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  target_course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  support_count INT NOT NULL,
  confidence NUMERIC(10,6) NOT NULL,
  lift NUMERIC(12,6) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_course_id, target_course_id)
);

CREATE TABLE IF NOT EXISTS ai_briefs (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  class_code VARCHAR(50) REFERENCES admin_classes(code) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    CHECK (sent_status IN ('DRAFT', 'NOTIFIED', 'SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_ai_briefs_advisor_class_created
  ON ai_briefs(advisor_id, class_code, created_at DESC);

COMMIT;

-- ===============================================================
-- 13) DEMO ACCOUNTS
-- ===============================================================
-- ADMIN:
--   admin@uit.edu.vn / password123
--
-- ADVISORS:
--   thornea@uit.edu.vn / password123
--   minhnv@uit.edu.vn / password123
--   thult@uit.edu.vn / password123
--   hungpq@uit.edu.vn / password123
--   lantrn@uit.edu.vn / password123
--
-- STUDENTS:
--   24521001@gm.uit.edu.vn / password123
--   24521002@gm.uit.edu.vn / password123
--   24521003@gm.uit.edu.vn / password123
--   24521004@gm.uit.edu.vn / password123
--   24521005@gm.uit.edu.vn / password123
--   24521006@gm.uit.edu.vn / password123
--   24521007@gm.uit.edu.vn / password123
--   24521008@gm.uit.edu.vn / password123
--
-- VERIFY:
--   SELECT role, COUNT(*) FROM users GROUP BY role;
--   SELECT * FROM student_academic_summary ORDER BY credit_debt DESC LIMIT 10;
--   SELECT * FROM conversations LIMIT 5;
--   SELECT * FROM appointments ORDER BY start_time LIMIT 5;
--   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
-- =====================================================================
