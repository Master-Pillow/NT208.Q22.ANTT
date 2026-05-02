DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ADVISOR'))
);

CREATE TABLE admin_classes (
    code    VARCHAR(50) PRIMARY KEY,
    name    VARCHAR(255),
    cohort  VARCHAR(50),
    program VARCHAR(255)
);

CREATE TABLE advisor_class (
    advisor_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_code VARCHAR(50) NOT NULL REFERENCES admin_classes(code) ON DELETE CASCADE,
    PRIMARY KEY (advisor_id, class_code)
);

CREATE TABLE students (
    id         BIGSERIAL PRIMARY KEY,
    mssv       VARCHAR(50) UNIQUE NOT NULL,
    full_name  VARCHAR(255) NOT NULL,
    class_code VARCHAR(50) REFERENCES admin_classes(code) ON DELETE SET NULL,
    cohort     VARCHAR(50)
);

CREATE TABLE courses (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(50) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    credits    INT NOT NULL,
    department VARCHAR(50)
);

CREATE TABLE enrollments (
    id         BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id  BIGINT NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
    semester   VARCHAR(20),
    -- ✅ Thêm: tránh sinh viên đăng ký trùng môn trong cùng học kỳ
    UNIQUE (student_id, course_id, semester)
);

CREATE TABLE grades (
    enrollment_id BIGINT PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
    letter_grade  VARCHAR(5),
    gpa_points    NUMERIC(3,2)
);

-- Bảng tùy chọn - giữ lại để dùng cho LogNotes sau này
CREATE TABLE advising_logs (
    id              BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    advisor_user_id BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    reason          VARCHAR(255),
    action_plan     VARCHAR(255),
    note            TEXT
);