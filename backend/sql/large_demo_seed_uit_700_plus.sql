-- =====================================================================
-- UIT AdvisorHub - Large Demo Seed 700+
-- Purpose:
--   Add a large, repeatable demo dataset for Advisor Hub without deleting
--   existing data.
--
-- Safe to run many times:
--   - No DROP SCHEMA
--   - No DELETE/TRUNCATE
--   - Uses deterministic demo codes/MSSV/email
--   - Uses ON CONFLICT DO NOTHING / guarded inserts
--
-- Expected first-run additions:
--   - 30 classes across 15 UIT programs
--   - 20 advisors
--   - 60+ courses
--   - 810 students
--   - 120 student login accounts
--   - Roughly 8,500-10,500 enrollments and grades
--
-- Source program list reference:
--   https://tuyensinh.uit.edu.vn/nganh-dao-tao
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Programs and classes
-- ---------------------------------------------------------------------

CREATE TEMP TABLE tmp_large_programs (
  program_prefix VARCHAR(10) PRIMARY KEY,
  program_name   VARCHAR(255) NOT NULL,
  department     VARCHAR(50) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_large_programs (program_prefix, program_name, department) VALUES
('IT',  'Công nghệ Thông tin', 'IT'),
('IS',  'Hệ thống Thông tin', 'IS'),
('CS',  'Khoa học Máy tính', 'CS'),
('SE',  'Kỹ thuật Phần mềm', 'SE'),
('CE',  'Kỹ thuật Máy tính', 'CE'),
('NT',  'Mạng máy tính và Truyền thông Dữ liệu', 'NT'),
('AT',  'An toàn Thông tin', 'AT'),
('EC',  'Thương mại Điện tử', 'EC'),
('DS',  'Khoa học Dữ liệu', 'DS'),
('AI',  'Trí tuệ Nhân tạo', 'AI'),
('IC',  'Thiết kế Vi mạch', 'IC'),
('MM',  'Truyền thông Đa phương tiện', 'MM'),
('CEI', 'Kỹ thuật Máy tính chương trình liên kết quốc tế', 'CE'),
('ATI', 'An toàn thông tin chương trình liên kết quốc tế', 'AT'),
('CSI', 'Khoa học Máy tính chương trình liên kết quốc tế', 'CS');

CREATE TEMP TABLE tmp_large_classes (
  class_code     VARCHAR(50) PRIMARY KEY,
  class_name     VARCHAR(255) NOT NULL,
  cohort         VARCHAR(50) NOT NULL,
  program_prefix VARCHAR(10) NOT NULL,
  program_name   VARCHAR(255) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_large_classes (class_code, class_name, cohort, program_prefix, program_name) VALUES
('IT2022A',  'Công nghệ Thông tin 2022 - Lớp A', '2022', 'IT',  'Công nghệ Thông tin'),
('IT2023B',  'Công nghệ Thông tin 2023 - Lớp B', '2023', 'IT',  'Công nghệ Thông tin'),
('IS2023A',  'Hệ thống Thông tin 2023 - Lớp A', '2023', 'IS',  'Hệ thống Thông tin'),
('IS2024B',  'Hệ thống Thông tin 2024 - Lớp B', '2024', 'IS',  'Hệ thống Thông tin'),
('CS2022B',  'Khoa học Máy tính 2022 - Lớp B', '2022', 'CS',  'Khoa học Máy tính'),
('CS2025A',  'Khoa học Máy tính 2025 - Lớp A', '2025', 'CS',  'Khoa học Máy tính'),
('SE2023C',  'Kỹ thuật Phần mềm 2023 - Lớp C', '2023', 'SE',  'Kỹ thuật Phần mềm'),
('SE2025A',  'Kỹ thuật Phần mềm 2025 - Lớp A', '2025', 'SE',  'Kỹ thuật Phần mềm'),
('CE2024A',  'Kỹ thuật Máy tính 2024 - Lớp A', '2024', 'CE',  'Kỹ thuật Máy tính'),
('CE2025B',  'Kỹ thuật Máy tính 2025 - Lớp B', '2025', 'CE',  'Kỹ thuật Máy tính'),
('NT2023A',  'Mạng máy tính và Truyền thông Dữ liệu 2023 - Lớp A', '2023', 'NT', 'Mạng máy tính và Truyền thông Dữ liệu'),
('NT2024C',  'Mạng máy tính và Truyền thông Dữ liệu 2024 - Lớp C', '2024', 'NT', 'Mạng máy tính và Truyền thông Dữ liệu'),
('AT2022A',  'An toàn Thông tin 2022 - Lớp A', '2022', 'AT',  'An toàn Thông tin'),
('AT2023B',  'An toàn Thông tin 2023 - Lớp B', '2023', 'AT',  'An toàn Thông tin'),
('EC2024A',  'Thương mại Điện tử 2024 - Lớp A', '2024', 'EC',  'Thương mại Điện tử'),
('EC2025B',  'Thương mại Điện tử 2025 - Lớp B', '2025', 'EC',  'Thương mại Điện tử'),
('DS2023C',  'Khoa học Dữ liệu 2023 - Lớp C', '2023', 'DS',  'Khoa học Dữ liệu'),
('DS2024B',  'Khoa học Dữ liệu 2024 - Lớp B', '2024', 'DS',  'Khoa học Dữ liệu'),
('AI2024C',  'Trí tuệ Nhân tạo 2024 - Lớp C', '2024', 'AI',  'Trí tuệ Nhân tạo'),
('AI2025A',  'Trí tuệ Nhân tạo 2025 - Lớp A', '2025', 'AI',  'Trí tuệ Nhân tạo'),
('IC2024A',  'Thiết kế Vi mạch 2024 - Lớp A', '2024', 'IC',  'Thiết kế Vi mạch'),
('IC2025B',  'Thiết kế Vi mạch 2025 - Lớp B', '2025', 'IC',  'Thiết kế Vi mạch'),
('MM2024A',  'Truyền thông Đa phương tiện 2024 - Lớp A', '2024', 'MM',  'Truyền thông Đa phương tiện'),
('MM2025B',  'Truyền thông Đa phương tiện 2025 - Lớp B', '2025', 'MM',  'Truyền thông Đa phương tiện'),
('CEI2024A', 'Kỹ thuật Máy tính CLC quốc tế 2024 - Lớp A', '2024', 'CEI', 'Kỹ thuật Máy tính chương trình liên kết quốc tế'),
('CEI2025B', 'Kỹ thuật Máy tính CLC quốc tế 2025 - Lớp B', '2025', 'CEI', 'Kỹ thuật Máy tính chương trình liên kết quốc tế'),
('ATI2024A', 'An toàn Thông tin CLC quốc tế 2024 - Lớp A', '2024', 'ATI', 'An toàn thông tin chương trình liên kết quốc tế'),
('ATI2025B', 'An toàn Thông tin CLC quốc tế 2025 - Lớp B', '2025', 'ATI', 'An toàn thông tin chương trình liên kết quốc tế'),
('CSI2024A', 'Khoa học Máy tính CLC quốc tế 2024 - Lớp A', '2024', 'CSI', 'Khoa học Máy tính chương trình liên kết quốc tế'),
('CSI2025B', 'Khoa học Máy tính CLC quốc tế 2025 - Lớp B', '2025', 'CSI', 'Khoa học Máy tính chương trình liên kết quốc tế');

INSERT INTO admin_classes (code, name, cohort, program)
SELECT class_code, class_name, cohort, program_name
FROM tmp_large_classes
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Advisors and advisor-class assignments
-- ---------------------------------------------------------------------

CREATE TEMP TABLE tmp_large_advisors (
  advisor_no INT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  full_name  VARCHAR(255) NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_large_advisors (advisor_no, email, full_name) VALUES
(1,  'advisor01@uit.edu.vn', 'TS. Nguyễn Minh Quân'),
(2,  'advisor02@uit.edu.vn', 'ThS. Trần Thu Hà'),
(3,  'advisor03@uit.edu.vn', 'TS. Lê Quốc Bảo'),
(4,  'advisor04@uit.edu.vn', 'ThS. Phạm Ngọc Anh'),
(5,  'advisor05@uit.edu.vn', 'TS. Hoàng Gia Huy'),
(6,  'advisor06@uit.edu.vn', 'ThS. Huỳnh Thanh Trúc'),
(7,  'advisor07@uit.edu.vn', 'TS. Phan Đức Long'),
(8,  'advisor08@uit.edu.vn', 'ThS. Vũ Thị Mai'),
(9,  'advisor09@uit.edu.vn', 'TS. Võ Thành Nam'),
(10, 'advisor10@uit.edu.vn', 'ThS. Đặng Kim Ngân'),
(11, 'advisor11@uit.edu.vn', 'TS. Bùi Hải Đăng'),
(12, 'advisor12@uit.edu.vn', 'ThS. Đỗ Minh Châu'),
(13, 'advisor13@uit.edu.vn', 'TS. Hồ Anh Tuấn'),
(14, 'advisor14@uit.edu.vn', 'ThS. Ngô Phương Linh'),
(15, 'advisor15@uit.edu.vn', 'TS. Dương Khánh Toàn'),
(16, 'advisor16@uit.edu.vn', 'ThS. Lý Hồng Nhung'),
(17, 'advisor17@uit.edu.vn', 'TS. Đinh Quốc Việt'),
(18, 'advisor18@uit.edu.vn', 'ThS. Lưu Bảo Ngọc'),
(19, 'advisor19@uit.edu.vn', 'TS. Cao Tấn Phát'),
(20, 'advisor20@uit.edu.vn', 'ThS. Tô Gia Hân');

INSERT INTO users (email, password_hash, full_name, role)
SELECT email, 'password123', full_name, 'ADVISOR'
FROM tmp_large_advisors
ON CONFLICT (email) DO NOTHING;

WITH numbered_classes AS (
  SELECT
    class_code,
    ROW_NUMBER() OVER (ORDER BY class_code) AS rn
  FROM tmp_large_classes
),
advisor_pool AS (
  SELECT
    u.id AS advisor_id,
    ROW_NUMBER() OVER (ORDER BY a.advisor_no) AS rn
  FROM tmp_large_advisors a
  JOIN users u ON u.email = a.email
  WHERE u.role = 'ADVISOR'
)
INSERT INTO advisor_class (advisor_id, class_code)
SELECT ap.advisor_id, nc.class_code
FROM numbered_classes nc
JOIN advisor_pool ap ON ap.rn = ((nc.rn - 1) % 20) + 1
ON CONFLICT (advisor_id, class_code) DO NOTHING;

-- Add a second advisor to every fifth demo class to diversify assignments.
WITH numbered_classes AS (
  SELECT
    class_code,
    ROW_NUMBER() OVER (ORDER BY class_code) AS rn
  FROM tmp_large_classes
),
advisor_pool AS (
  SELECT
    u.id AS advisor_id,
    ROW_NUMBER() OVER (ORDER BY a.advisor_no) AS rn
  FROM tmp_large_advisors a
  JOIN users u ON u.email = a.email
  WHERE u.role = 'ADVISOR'
)
INSERT INTO advisor_class (advisor_id, class_code)
SELECT ap.advisor_id, nc.class_code
FROM numbered_classes nc
JOIN advisor_pool ap ON ap.rn = ((nc.rn + 6) % 20) + 1
WHERE nc.rn % 5 = 0
ON CONFLICT (advisor_id, class_code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Courses
-- ---------------------------------------------------------------------

INSERT INTO courses (code, name, credits, department) VALUES
-- Foundation
('IT001',  'Nhập môn Lập trình', 3, 'IT'),
('IT002',  'Lập trình hướng đối tượng', 3, 'IT'),
('IT003',  'Cấu trúc dữ liệu và Giải thuật', 3, 'IT'),
('IT004',  'Hệ điều hành', 3, 'IT'),
('IT005',  'Cơ sở dữ liệu', 3, 'IT'),
('MA001',  'Giải tích', 3, 'MATH'),
('MA003',  'Xác suất thống kê', 3, 'MATH'),
('MA006',  'Toán rời rạc', 3, 'MATH'),
('ENG001', 'Anh văn 1', 2, 'ENG'),
('ENG002', 'Anh văn 2', 2, 'ENG'),
-- Computer Science
('CS111', 'Nhập môn Khoa học Máy tính', 3, 'CS'),
('CS112', 'Phân tích và Thiết kế Giải thuật', 3, 'CS'),
('CS221', 'Xử lý ngôn ngữ tự nhiên', 3, 'CS'),
('CS231', 'Nhập môn Thị giác máy tính', 3, 'CS'),
('CS316', 'Khai phá dữ liệu', 3, 'CS'),
-- Software Engineering
('SE101', 'Nhập môn Công nghệ Phần mềm', 3, 'SE'),
('SE104', 'Nhập môn Công nghệ Phần mềm nâng cao', 3, 'SE'),
('SE214', 'Nhập môn Phát triển Game', 3, 'SE'),
('SE301', 'Kiểm thử Phần mềm', 3, 'SE'),
('SE401', 'Mẫu thiết kế phần mềm', 3, 'SE'),
-- Information Security
('AT101', 'Nhập môn An toàn Thông tin', 3, 'AT'),
('AT102', 'Mật mã học cơ sở', 3, 'AT'),
('AT201', 'An ninh mạng', 3, 'AT'),
('AT301', 'Phân tích mã độc', 3, 'AT'),
('AT401', 'Kiểm thử xâm nhập', 3, 'AT'),
-- Network
('NT101', 'Mạng máy tính', 3, 'NT'),
('NT106', 'Lập trình mạng căn bản', 3, 'NT'),
('NT118', 'Phát triển ứng dụng trên thiết bị di động', 3, 'NT'),
('NT230', 'Quản trị mạng', 3, 'NT'),
('NT330', 'An toàn mạng không dây', 3, 'NT'),
-- Information Systems
('IS201', 'Phân tích thiết kế hệ thống thông tin', 3, 'IS'),
('IS207', 'Phát triển ứng dụng web', 3, 'IS'),
('IS216', 'Hệ quản trị cơ sở dữ liệu', 3, 'IS'),
('IS335', 'Thương mại điện tử', 3, 'IS'),
('IS403', 'Hệ thống thông tin doanh nghiệp', 3, 'IS'),
-- Data and AI
('DS101', 'Nhập môn Khoa học Dữ liệu', 3, 'DS'),
('DS201', 'Trực quan hóa dữ liệu', 3, 'DS'),
('DS301', 'Kho dữ liệu và OLAP', 3, 'DS'),
('AI101', 'Nhập môn Trí tuệ Nhân tạo', 3, 'AI'),
('AI201', 'Học máy', 3, 'AI'),
('AI301', 'Học sâu', 3, 'AI'),
-- Computer Engineering / IC
('CE101', 'Kiến trúc máy tính', 3, 'CE'),
('CE103', 'Vi xử lý', 3, 'CE'),
('CE213', 'Hệ thống nhúng', 3, 'CE'),
('IC101', 'Nhập môn Thiết kế Vi mạch', 3, 'IC'),
('IC201', 'Thiết kế số', 3, 'IC'),
('IC301', 'Thiết kế vi mạch VLSI', 3, 'IC'),
-- E-Commerce / Multimedia
('EC101', 'Tổng quan Thương mại Điện tử', 3, 'EC'),
('EC201', 'Marketing số', 3, 'EC'),
('EC301', 'Thanh toán điện tử', 3, 'EC'),
('MM101', 'Nhập môn Truyền thông Đa phương tiện', 3, 'MM'),
('MM201', 'Thiết kế đồ họa', 3, 'MM'),
('MM301', 'Xử lý ảnh và video', 3, 'MM'),
-- Additional electives to keep 2022 cohorts rich
('IT007', 'Hệ quản trị cơ sở dữ liệu thực hành', 3, 'IT'),
('IT008', 'Lập trình trực quan', 3, 'IT'),
('CS332', 'Tìm kiếm và trình diễn thông tin', 3, 'CS'),
('SE310', 'Công nghệ Web và ứng dụng', 3, 'SE'),
('AT402', 'Điều tra số', 3, 'AT'),
('NT532', 'Điện toán đám mây', 3, 'NT'),
('DS401', 'Dữ liệu lớn', 3, 'DS'),
('AI401', 'Ứng dụng AI trong doanh nghiệp', 3, 'AI'),
('CE401', 'Internet vạn vật', 3, 'CE'),
('EC401', 'Phân tích hành vi khách hàng số', 3, 'EC')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Students
-- ---------------------------------------------------------------------

CREATE TEMP TABLE tmp_large_seed_students (
  mssv           VARCHAR(50) PRIMARY KEY,
  full_name      VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  phone          VARCHAR(30),
  class_code     VARCHAR(50) NOT NULL,
  cohort         VARCHAR(50) NOT NULL,
  program_prefix VARCHAR(10) NOT NULL,
  student_no     INT NOT NULL,
  ability        VARCHAR(20) NOT NULL,
  status         VARCHAR(30) NOT NULL
) ON COMMIT DROP;

WITH class_rows AS (
  SELECT
    c.*,
    ROW_NUMBER() OVER (ORDER BY c.class_code) AS class_rank
  FROM tmp_large_classes c
),
generated AS (
  SELECT
    cr.*,
    gs.student_no,
    ((gs.student_no * 37 + cr.class_rank * 11) % 100) AS ability_roll,
    ((gs.student_no + cr.class_rank) % 2 = 0) AS is_female
  FROM class_rows cr
  CROSS JOIN generate_series(1, 27) AS gs(student_no)
),
named AS (
  SELECT
    'D' || cohort || program_prefix || LPAD(student_no::text, 3, '0') AS mssv,
    (
      (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Lưu','Cao','Tô'])
        [1 + ((student_no + class_rank) % 20)]
      || ' ' ||
      CASE WHEN is_female THEN
        (ARRAY['Thị','Ngọc','Kim','Thanh','Hồng','Phương','Thu','Ánh','Tuyết','Mai','Bảo','Khánh'])
          [1 + ((student_no * 2 + class_rank) % 12)]
      ELSE
        (ARRAY['Văn','Quốc','Minh','Hữu','Đức','Công','Thành','Bảo','Gia','Tiến','Anh','Nhật'])
          [1 + ((student_no * 3 + class_rank) % 12)]
      END
      || ' ' ||
      CASE WHEN is_female THEN
        (ARRAY['Anh','Châu','Dung','Hà','Hương','Lan','Linh','Mai','Nga','Nhi','Oanh','Phương','Thảo','Thùy','Trang','Trinh','Uyên','Vân','Xuân','Yến'])
          [1 + ((student_no * 5 + class_rank) % 20)]
      ELSE
        (ARRAY['An','Bình','Cường','Dũng','Giang','Hải','Khoa','Long','Nam','Phúc','Quân','Sơn','Thắng','Trung','Tuấn','Việt','Đạt','Hưng','Khải','Lâm'])
          [1 + ((student_no * 7 + class_rank) % 20)]
      END
    ) AS full_name,
    LOWER('demo.' || 'D' || cohort || program_prefix || LPAD(student_no::text, 3, '0') || '@uit.edu.vn') AS email,
    '09' || LPAD((70000000 + class_rank * 100 + student_no)::text, 8, '0') AS phone,
    class_code,
    cohort,
    program_prefix,
    student_no,
    CASE
      WHEN ability_roll < 8 THEN 'XUAT_SAC'
      WHEN ability_roll < 28 THEN 'GIOI'
      WHEN ability_roll < 65 THEN 'KHA'
      WHEN ability_roll < 87 THEN 'TRUNG_BINH'
      WHEN ability_roll < 96 THEN 'YEU'
      ELSE 'NGUY_CO'
    END AS ability
  FROM generated
)
INSERT INTO tmp_large_seed_students (
  mssv,
  full_name,
  email,
  phone,
  class_code,
  cohort,
  program_prefix,
  student_no,
  ability,
  status
)
SELECT
  mssv,
  full_name,
  email,
  phone,
  class_code,
  cohort,
  program_prefix,
  student_no,
  ability,
  CASE WHEN ability IN ('YEU', 'NGUY_CO') THEN 'AT_RISK' ELSE 'ACTIVE' END AS status
FROM named;

INSERT INTO students (mssv, full_name, email, phone, class_code, cohort, status)
SELECT mssv, full_name, email, phone, class_code, cohort, status
FROM tmp_large_seed_students
ON CONFLICT (mssv) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Student login accounts for first 120 demo students
-- ---------------------------------------------------------------------

INSERT INTO users (email, password_hash, full_name, role, student_id)
SELECT
  LOWER('sv' || s.mssv || '@uit.edu.vn') AS email,
  'password123' AS password_hash,
  s.full_name,
  'STUDENT' AS role,
  s.id AS student_id
FROM students s
JOIN tmp_large_seed_students t ON t.mssv = s.mssv
WHERE NOT EXISTS (
  SELECT 1
  FROM users u
  WHERE u.student_id = s.id
)
ORDER BY s.mssv
LIMIT 120
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Enrollments
-- ---------------------------------------------------------------------

CREATE TEMP TABLE tmp_large_course_plan (
  program_prefix VARCHAR(10) NOT NULL,
  course_code    VARCHAR(50) NOT NULL,
  course_order   INT NOT NULL,
  PRIMARY KEY (program_prefix, course_code)
) ON COMMIT DROP;

INSERT INTO tmp_large_course_plan (program_prefix, course_code, course_order)
SELECT p.program_prefix, v.course_code, v.course_order
FROM tmp_large_programs p
CROSS JOIN (VALUES
  ('IT001', 1), ('IT002', 2), ('IT003', 3), ('MA001', 4), ('ENG001', 5),
  ('IT004', 6), ('IT005', 7), ('MA006', 8), ('MA003', 9), ('ENG002', 10)
) AS v(course_code, course_order);

INSERT INTO tmp_large_course_plan (program_prefix, course_code, course_order) VALUES
('IT','IS207',11), ('IT','SE310',12), ('IT','IT007',13), ('IT','NT101',14), ('IT','CS112',15), ('IT','DS101',16), ('IT','AI101',17), ('IT','IT008',18),
('IS','IS201',11), ('IS','IS207',12), ('IS','IS216',13), ('IS','IS335',14), ('IS','IS403',15), ('IS','EC101',16), ('IS','DS101',17), ('IS','SE310',18),
('CS','CS111',11), ('CS','CS112',12), ('CS','CS221',13), ('CS','CS231',14), ('CS','CS316',15), ('CS','AI201',16), ('CS','DS101',17), ('CS','CS332',18),
('SE','SE101',11), ('SE','SE104',12), ('SE','SE214',13), ('SE','SE301',14), ('SE','SE401',15), ('SE','SE310',16), ('SE','IS207',17), ('SE','CS112',18),
('CE','CE101',11), ('CE','CE103',12), ('CE','CE213',13), ('CE','IC101',14), ('CE','IC201',15), ('CE','CE401',16), ('CE','NT101',17), ('CE','IT008',18),
('NT','NT101',11), ('NT','NT106',12), ('NT','NT118',13), ('NT','NT230',14), ('NT','NT330',15), ('NT','AT201',16), ('NT','NT532',17), ('NT','AT102',18),
('AT','AT101',11), ('AT','AT102',12), ('AT','AT201',13), ('AT','AT301',14), ('AT','AT401',15), ('AT','NT101',16), ('AT','NT330',17), ('AT','AT402',18),
('EC','EC101',11), ('EC','EC201',12), ('EC','EC301',13), ('EC','IS335',14), ('EC','IS403',15), ('EC','DS201',16), ('EC','EC401',17), ('EC','IS207',18),
('DS','DS101',11), ('DS','DS201',12), ('DS','DS301',13), ('DS','AI201',14), ('DS','CS316',15), ('DS','DS401',16), ('DS','AI101',17), ('DS','AI301',18),
('AI','AI101',11), ('AI','AI201',12), ('AI','AI301',13), ('AI','DS101',14), ('AI','CS221',15), ('AI','CS231',16), ('AI','AI401',17), ('AI','DS201',18),
('IC','CE101',11), ('IC','CE103',12), ('IC','IC101',13), ('IC','IC201',14), ('IC','IC301',15), ('IC','CE213',16), ('IC','CE401',17), ('IC','NT101',18),
('MM','MM101',11), ('MM','MM201',12), ('MM','MM301',13), ('MM','CS231',14), ('MM','DS201',15), ('MM','EC201',16), ('MM','IS207',17), ('MM','AI101',18),
('CEI','CE101',11), ('CEI','CE103',12), ('CEI','CE213',13), ('CEI','IC101',14), ('CEI','IC201',15), ('CEI','CE401',16), ('CEI','ENG001',17), ('CEI','ENG002',18),
('ATI','AT101',11), ('ATI','AT102',12), ('ATI','AT201',13), ('ATI','AT301',14), ('ATI','AT401',15), ('ATI','NT101',16), ('ATI','ENG001',17), ('ATI','ENG002',18),
('CSI','CS111',11), ('CSI','CS112',12), ('CSI','CS221',13), ('CSI','CS231',14), ('CSI','CS316',15), ('CSI','AI201',16), ('CSI','ENG001',17), ('CSI','ENG002',18)
ON CONFLICT (program_prefix, course_code) DO NOTHING;

WITH wanted_courses AS (
  SELECT
    ss.mssv,
    ss.cohort,
    ss.student_no,
    cp.course_code,
    cp.course_order,
    CASE
      WHEN ss.cohort = '2022' THEN 16 + (ss.student_no % 3)
      WHEN ss.cohort = '2023' THEN 13 + (ss.student_no % 3)
      WHEN ss.cohort = '2024' THEN 10 + (ss.student_no % 3)
      ELSE 6 + (ss.student_no % 3)
    END AS max_courses
  FROM tmp_large_seed_students ss
  JOIN tmp_large_course_plan cp ON cp.program_prefix = ss.program_prefix
),
planned_enrollments AS (
  SELECT
    s.id AS student_id,
    c.id AS course_id,
    wc.course_order,
    CASE
      WHEN wc.cohort = '2022' THEN
        CASE
          WHEN wc.course_order <= 3 THEN 'HK1-2022'
          WHEN wc.course_order <= 6 THEN 'HK2-2022'
          WHEN wc.course_order <= 9 THEN 'HK1-2023'
          WHEN wc.course_order <= 12 THEN 'HK2-2023'
          WHEN wc.course_order <= 15 THEN 'HK1-2024'
          WHEN wc.course_order <= 17 THEN 'HK2-2024'
          ELSE 'HK1-2025'
        END
      WHEN wc.cohort = '2023' THEN
        CASE
          WHEN wc.course_order <= 3 THEN 'HK1-2023'
          WHEN wc.course_order <= 6 THEN 'HK2-2023'
          WHEN wc.course_order <= 10 THEN 'HK1-2024'
          WHEN wc.course_order <= 13 THEN 'HK2-2024'
          ELSE 'HK1-2025'
        END
      WHEN wc.cohort = '2024' THEN
        CASE
          WHEN wc.course_order <= 4 THEN 'HK1-2024'
          WHEN wc.course_order <= 8 THEN 'HK2-2024'
          ELSE 'HK1-2025'
        END
      ELSE 'HK1-2025'
    END AS semester
  FROM wanted_courses wc
  JOIN students s ON s.mssv = wc.mssv
  JOIN courses c ON c.code = wc.course_code
  WHERE wc.course_order <= wc.max_courses
)
INSERT INTO enrollments (student_id, course_id, semester)
SELECT student_id, course_id, semester
FROM planned_enrollments
ON CONFLICT (student_id, course_id, semester) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. Grades reflecting student ability, hard courses, and anomaly cases
-- ---------------------------------------------------------------------

WITH seed_enrollments AS (
  SELECT
    e.id AS enrollment_id,
    ss.ability,
    ss.program_prefix,
    ss.student_no,
    cp.course_order,
    c.code AS course_code,
    random() AS r
  FROM enrollments e
  JOIN students s ON s.id = e.student_id
  JOIN tmp_large_seed_students ss ON ss.mssv = s.mssv
  JOIN courses c ON c.id = e.course_id
  JOIN tmp_large_course_plan cp
    ON cp.program_prefix = ss.program_prefix
   AND cp.course_code = c.code
  LEFT JOIN grades g ON g.enrollment_id = e.id
  WHERE g.enrollment_id IS NULL
),
graded AS (
  SELECT
    enrollment_id,
    CASE
      WHEN (
        course_code IN ('MA006','IT003') AND student_no IN (5, 12, 19, 26)
      ) OR (
        course_code IN ('IT003','IT004') AND student_no IN (6, 13, 20, 27)
      ) OR (
        program_prefix IN ('AT','ATI') AND course_code IN ('AT102','AT201') AND student_no IN (4, 11, 18, 25)
      ) OR (
        program_prefix IN ('AI','DS','CSI') AND course_code IN ('AI201','AI301') AND student_no IN (7, 14, 21)
      ) THEN 'F'
      WHEN student_no IN (9, 16, 23) AND course_order >= 11 THEN
        CASE
          WHEN r < 0.45 THEN 'F'
          WHEN r < 0.85 THEN 'D'
          ELSE 'C'
        END
      ELSE
        CASE ability
          WHEN 'XUAT_SAC' THEN
            CASE
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.08 ELSE 0 END, 0.999) < 0.70 THEN 'A'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.08 ELSE 0 END, 0.999) < 0.95 THEN 'B'
              ELSE 'C'
            END
          WHEN 'GIOI' THEN
            CASE
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.08 ELSE 0 END, 0.999) < 0.45 THEN 'A'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.08 ELSE 0 END, 0.999) < 0.85 THEN 'B'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.08 ELSE 0 END, 0.999) < 0.97 THEN 'C'
              ELSE 'D'
            END
          WHEN 'KHA' THEN
            CASE
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.10 ELSE 0 END, 0.999) < 0.25 THEN 'A'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.10 ELSE 0 END, 0.999) < 0.70 THEN 'B'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.10 ELSE 0 END, 0.999) < 0.94 THEN 'C'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.10 ELSE 0 END, 0.999) < 0.99 THEN 'D'
              ELSE 'F'
            END
          WHEN 'TRUNG_BINH' THEN
            CASE
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.08 THEN 'A'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.33 THEN 'B'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.75 THEN 'C'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.95 THEN 'D'
              ELSE 'F'
            END
          WHEN 'YEU' THEN
            CASE
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.03 THEN 'A'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.13 THEN 'B'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.40 THEN 'C'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.75 THEN 'D'
              ELSE 'F'
            END
          ELSE
            CASE
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.01 THEN 'A'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.05 THEN 'B'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.20 THEN 'C'
              WHEN LEAST(r + CASE WHEN course_code IN ('IT002','IT003','IT004','IT005','MA001','MA003','MA006','NT101','AT102','CS112','AI201','CE101','IC201') THEN 0.12 ELSE 0 END, 0.999) < 0.55 THEN 'D'
              ELSE 'F'
            END
        END
    END AS letter_grade
  FROM seed_enrollments
)
INSERT INTO grades (enrollment_id, letter_grade, numeric_grade, gpa_points)
SELECT
  enrollment_id,
  letter_grade,
  CASE letter_grade
    WHEN 'A' THEN ROUND((8.5 + random() * 1.5)::numeric, 2)
    WHEN 'B' THEN ROUND((7.0 + random() * 1.4)::numeric, 2)
    WHEN 'C' THEN ROUND((5.5 + random() * 1.4)::numeric, 2)
    WHEN 'D' THEN ROUND((4.0 + random() * 1.4)::numeric, 2)
    ELSE ROUND((random() * 3.9)::numeric, 2)
  END AS numeric_grade,
  CASE letter_grade
    WHEN 'A' THEN 4.00
    WHEN 'B' THEN 3.00
    WHEN 'C' THEN 2.00
    WHEN 'D' THEN 1.00
    ELSE 0.00
  END AS gpa_points
FROM graded
ON CONFLICT (enrollment_id) DO NOTHING;

-- Fallback: if any enrollment in the database still has no grade, give it a
-- reasonable KHA-like grade so dashboards do not show large blank sections.
WITH missing AS (
  SELECT e.id AS enrollment_id, random() AS r
  FROM enrollments e
  LEFT JOIN grades g ON g.enrollment_id = e.id
  WHERE g.enrollment_id IS NULL
),
graded AS (
  SELECT
    enrollment_id,
    CASE
      WHEN r < 0.25 THEN 'A'
      WHEN r < 0.70 THEN 'B'
      WHEN r < 0.94 THEN 'C'
      WHEN r < 0.99 THEN 'D'
      ELSE 'F'
    END AS letter_grade
  FROM missing
)
INSERT INTO grades (enrollment_id, letter_grade, numeric_grade, gpa_points)
SELECT
  enrollment_id,
  letter_grade,
  CASE letter_grade
    WHEN 'A' THEN ROUND((8.5 + random() * 1.5)::numeric, 2)
    WHEN 'B' THEN ROUND((7.0 + random() * 1.4)::numeric, 2)
    WHEN 'C' THEN ROUND((5.5 + random() * 1.4)::numeric, 2)
    WHEN 'D' THEN ROUND((4.0 + random() * 1.4)::numeric, 2)
    ELSE ROUND((random() * 3.9)::numeric, 2)
  END AS numeric_grade,
  CASE letter_grade
    WHEN 'A' THEN 4.00
    WHEN 'B' THEN 3.00
    WHEN 'C' THEN 2.00
    WHEN 'D' THEN 1.00
    ELSE 0.00
  END AS gpa_points
FROM graded
ON CONFLICT (enrollment_id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------
-- 9. Verification queries
-- ---------------------------------------------------------------------

SELECT COUNT(*) AS total_students FROM students;

SELECT class_code, COUNT(*) AS student_count
FROM students
GROUP BY class_code
ORDER BY class_code;

SELECT cohort, COUNT(*) AS student_count
FROM students
GROUP BY cohort
ORDER BY cohort;

SELECT ac.program, COUNT(*) AS student_count
FROM students s
JOIN admin_classes ac ON ac.code = s.class_code
GROUP BY ac.program
ORDER BY COUNT(*) DESC, ac.program;

SELECT COUNT(*) AS advisor_count
FROM users
WHERE role = 'ADVISOR';

SELECT COUNT(*) AS enrollment_count FROM enrollments;

SELECT COUNT(*) AS grade_count FROM grades;

SELECT
  CASE
    WHEN current_gpa >= 3.6 THEN 'Xuat sac'
    WHEN current_gpa >= 3.2 THEN 'Gioi'
    WHEN current_gpa >= 2.5 THEN 'Kha'
    WHEN current_gpa >= 2.0 THEN 'Trung binh'
    ELSE 'Yeu'
  END AS gpa_group,
  COUNT(*) AS student_count
FROM student_academic_summary
GROUP BY gpa_group
ORDER BY gpa_group;

SELECT *
FROM student_academic_summary
ORDER BY current_gpa DESC, full_name ASC
LIMIT 20;

SELECT *
FROM student_academic_summary
ORDER BY current_gpa ASC, failed_subjects DESC, full_name ASC
LIMIT 20;

SELECT COUNT(*) AS students_with_two_or_more_f
FROM student_academic_summary
WHERE failed_subjects >= 2;
