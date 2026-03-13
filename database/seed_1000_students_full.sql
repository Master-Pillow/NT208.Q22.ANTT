-- seed_1000_students_full.sql
-- Seed theo schema cũ
-- Tạo:
-- - 1 admin
-- - 5 advisor
-- - 5 lớp
-- - 40 môn học
-- - 1000 sinh viên
-- - dữ liệu điểm theo nhiều scenario:
--   NORMAL, FAIL_COURSE, GPA_DROP, DELAY_GRAD, RETAKE_MULTI
--
-- Lưu ý:
-- - dùng thang điểm 10
-- - final_score >= 5.0 là qua môn
-- - script xóa dữ liệu FAKE cũ trước khi seed lại

BEGIN;

-- Xóa dữ liệu fake cũ
DELETE FROM grades
WHERE enrollment_id IN (
  SELECT e.id
  FROM enrollments e
  JOIN students s ON s.id = e.student_id
  WHERE s.mssv LIKE 'FAKE%'
);

DELETE FROM enrollments
WHERE student_id IN (
  SELECT id FROM students WHERE mssv LIKE 'FAKE%'
);

DELETE FROM advising_logs
WHERE student_id IN (
  SELECT id FROM students WHERE mssv LIKE 'FAKE%'
);

DELETE FROM students
WHERE mssv LIKE 'FAKE%';

DELETE FROM advisor_class
WHERE class_id IN (
  SELECT id FROM classes WHERE code LIKE 'FAKE.%'
);

DELETE FROM classes
WHERE code LIKE 'FAKE.%';

DELETE FROM users
WHERE email LIKE 'fake_advisor%@uit.edu.vn';

DELETE FROM users
WHERE email = 'admin@uit.edu.vn';

DELETE FROM courses
WHERE code LIKE 'TST%';

-- Admin + advisors
INSERT INTO users (email, password_hash, role) VALUES
('admin@uit.edu.vn', '123456', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, role) VALUES
('fake_advisor1@uit.edu.vn', '123456', 'ADVISOR'),
('fake_advisor2@uit.edu.vn', '123456', 'ADVISOR'),
('fake_advisor3@uit.edu.vn', '123456', 'ADVISOR'),
('fake_advisor4@uit.edu.vn', '123456', 'ADVISOR'),
('fake_advisor5@uit.edu.vn', '123456', 'ADVISOR')
ON CONFLICT (email) DO NOTHING;

-- Classes
INSERT INTO classes (code, cohort) VALUES
('FAKE.2022.1', '2022'),
('FAKE.2022.2', '2022'),
('FAKE.2023.1', '2023'),
('FAKE.2023.2', '2023'),
('FAKE.2024.1', '2024')
ON CONFLICT (code) DO NOTHING;

-- Gán advisor cho lớp
INSERT INTO advisor_class (advisor_user_id, class_id)
SELECT u.id, c.id
FROM users u, classes c
WHERE (u.email = 'fake_advisor1@uit.edu.vn' AND c.code = 'FAKE.2022.1')
ON CONFLICT (advisor_user_id, class_id) DO NOTHING;

INSERT INTO advisor_class (advisor_user_id, class_id)
SELECT u.id, c.id
FROM users u, classes c
WHERE (u.email = 'fake_advisor2@uit.edu.vn' AND c.code = 'FAKE.2022.2')
ON CONFLICT (advisor_user_id, class_id) DO NOTHING;

INSERT INTO advisor_class (advisor_user_id, class_id)
SELECT u.id, c.id
FROM users u, classes c
WHERE (u.email = 'fake_advisor3@uit.edu.vn' AND c.code = 'FAKE.2023.1')
ON CONFLICT (advisor_user_id, class_id) DO NOTHING;

INSERT INTO advisor_class (advisor_user_id, class_id)
SELECT u.id, c.id
FROM users u, classes c
WHERE (u.email = 'fake_advisor4@uit.edu.vn' AND c.code = 'FAKE.2023.2')
ON CONFLICT (advisor_user_id, class_id) DO NOTHING;

INSERT INTO advisor_class (advisor_user_id, class_id)
SELECT u.id, c.id
FROM users u, classes c
WHERE (u.email = 'fake_advisor5@uit.edu.vn' AND c.code = 'FAKE.2024.1')
ON CONFLICT (advisor_user_id, class_id) DO NOTHING;

-- Courses
INSERT INTO courses (code, name, credits)
SELECT
  'TST' || LPAD(gs::text, 3, '0'),
  CASE gs
    WHEN 1 THEN 'Nhap mon lap trinh'
    WHEN 2 THEN 'Lap trinh huong doi tuong'
    WHEN 3 THEN 'Cau truc du lieu va giai thuat'
    WHEN 4 THEN 'Co so du lieu'
    WHEN 5 THEN 'He dieu hanh'
    WHEN 6 THEN 'Mang may tinh'
    WHEN 7 THEN 'Lap trinh ung dung Web'
    WHEN 8 THEN 'An toan thong tin'
    WHEN 9 THEN 'Tri tue nhan tao'
    WHEN 10 THEN 'Phan tich thiet ke he thong'
    WHEN 11 THEN 'Kien truc may tinh'
    WHEN 12 THEN 'Nhap mon Khoa hoc du lieu'
    WHEN 13 THEN 'Toan roi rac'
    WHEN 14 THEN 'Giai tich 1'
    WHEN 15 THEN 'Xac suat thong ke'
    WHEN 16 THEN 'Tieng Anh 1'
    WHEN 17 THEN 'Tieng Anh 2'
    WHEN 18 THEN 'Tieng Anh 3'
    WHEN 19 THEN 'Tieng Anh chuyen nganh'
    WHEN 20 THEN 'Cong nghe phan mem'
    WHEN 21 THEN 'Nhap mon DevOps'
    WHEN 22 THEN 'Bao mat he thong'
    WHEN 23 THEN 'Kiem thu phan mem'
    WHEN 24 THEN 'Thiet ke giao dien'
    WHEN 25 THEN 'Phat trien ung dung di dong'
    WHEN 26 THEN 'Du lieu lon'
    WHEN 27 THEN 'Khai pha du lieu'
    WHEN 28 THEN 'Do an chuyen nganh'
    WHEN 29 THEN 'Thuc tap doanh nghiep'
    WHEN 30 THEN 'Chuyen de tot nghiep 1'
    WHEN 31 THEN 'Chuyen de tot nghiep 2'
    WHEN 32 THEN 'Toan ung dung'
    WHEN 33 THEN 'He co so tri thuc'
    WHEN 34 THEN 'Phan tich du lieu'
    WHEN 35 THEN 'Dien toan dam may'
    WHEN 36 THEN 'Nhap mon blockchain'
    WHEN 37 THEN 'Quan tri du an CNTT'
    WHEN 38 THEN 'Phap luat dai cuong'
    WHEN 39 THEN 'Kinh te hoc dai cuong'
    WHEN 40 THEN 'Ky nang mem'
  END,
  CASE
    WHEN gs IN (28,29,30,31) THEN 4
    WHEN gs IN (5,6,7,8,9,20,25,26,27,35) THEN 4
    ELSE 3
  END
FROM generate_series(1, 40) gs
ON CONFLICT (code) DO NOTHING;

COMMIT;

DO $$
DECLARE
  v_student_id BIGINT;
  v_class_id BIGINT;
  v_enrollment_id BIGINT;
  v_course_id BIGINT;
  v_score NUMERIC;
  v_letter VARCHAR(5);
  v_gpa NUMERIC;
  v_status VARCHAR(20);
  v_scenario VARCHAR(50);
  semesters_short TEXT[] := ARRAY['2023-1','2023-2','2024-1','2024-2','2025-1','2025-2'];
  i INT;
  sem_idx INT;
  c_idx INT;
BEGIN
  FOR i IN 1..1000 LOOP
    IF i <= 500 THEN
      v_scenario := 'NORMAL';
    ELSIF i <= 700 THEN
      v_scenario := 'FAIL_COURSE';
    ELSIF i <= 820 THEN
      v_scenario := 'GPA_DROP';
    ELSIF i <= 920 THEN
      v_scenario := 'DELAY_GRAD';
    ELSE
      v_scenario := 'RETAKE_MULTI';
    END IF;

    SELECT id INTO v_class_id
    FROM classes
    WHERE code = CASE ((i - 1) % 5)
      WHEN 0 THEN 'FAKE.2022.1'
      WHEN 1 THEN 'FAKE.2022.2'
      WHEN 2 THEN 'FAKE.2023.1'
      WHEN 3 THEN 'FAKE.2023.2'
      ELSE 'FAKE.2024.1'
    END;

    INSERT INTO students (mssv, full_name, dob, class_id)
    VALUES (
      'FAKE' || LPAD(i::text, 6, '0'),
      'Sinh vien test ' || i,
      DATE '2002-01-01' + ((i * 7) % 1200),
      v_class_id
    )
    RETURNING id INTO v_student_id;

    IF v_scenario = 'NORMAL' THEN
      FOR sem_idx IN 1..6 LOOP
        FOR c_idx IN 1..4 LOOP
          SELECT id INTO v_course_id
          FROM courses
          WHERE code = 'TST' || LPAD((((i + sem_idx * 5 + c_idx) % 40) + 1)::text, 3, '0');

          v_score := ROUND((6.0 + ((i + sem_idx + c_idx) % 35) / 10.0)::numeric, 1);
          v_status := 'HOC_MOI';

          INSERT INTO enrollments (student_id, course_id, semester, status)
          VALUES (v_student_id, v_course_id, semesters_short[sem_idx], v_status)
          RETURNING id INTO v_enrollment_id;

          v_letter := CASE
            WHEN v_score >= 8.5 THEN 'A'
            WHEN v_score >= 8.0 THEN 'B+'
            WHEN v_score >= 7.0 THEN 'B'
            WHEN v_score >= 6.5 THEN 'C+'
            WHEN v_score >= 5.5 THEN 'C'
            WHEN v_score >= 5.0 THEN 'D'
            ELSE 'F'
          END;

          v_gpa := CASE
            WHEN v_score >= 8.5 THEN 4.0
            WHEN v_score >= 8.0 THEN 3.5
            WHEN v_score >= 7.0 THEN 3.0
            WHEN v_score >= 6.5 THEN 2.5
            WHEN v_score >= 5.5 THEN 2.0
            WHEN v_score >= 5.0 THEN 1.0
            ELSE 0.0
          END;

          INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
          VALUES (
            v_enrollment_id,
            jsonb_build_object(
              'process', GREATEST(v_score - 0.5, 0),
              'midterm', GREATEST(v_score - 0.2, 0),
              'final', v_score
            ),
            v_score,
            v_letter,
            v_gpa
          );
        END LOOP;
      END LOOP;

    ELSIF v_scenario = 'FAIL_COURSE' THEN
      FOR sem_idx IN 1..6 LOOP
        FOR c_idx IN 1..4 LOOP
          SELECT id INTO v_course_id
          FROM courses
          WHERE code = 'TST' || LPAD((((i + sem_idx * 3 + c_idx) % 40) + 1)::text, 3, '0');

          IF sem_idx = 6 AND c_idx IN (3,4) THEN
            v_score := ROUND((3.0 + ((i + c_idx) % 15) / 10.0)::numeric, 1);
          ELSE
            v_score := ROUND((5.8 + ((i + sem_idx + c_idx) % 28) / 10.0)::numeric, 1);
          END IF;

          v_status := 'HOC_MOI';

          INSERT INTO enrollments (student_id, course_id, semester, status)
          VALUES (v_student_id, v_course_id, semesters_short[sem_idx], v_status)
          RETURNING id INTO v_enrollment_id;

          v_letter := CASE
            WHEN v_score >= 8.5 THEN 'A'
            WHEN v_score >= 8.0 THEN 'B+'
            WHEN v_score >= 7.0 THEN 'B'
            WHEN v_score >= 6.5 THEN 'C+'
            WHEN v_score >= 5.5 THEN 'C'
            WHEN v_score >= 5.0 THEN 'D'
            ELSE 'F'
          END;

          v_gpa := CASE
            WHEN v_score >= 8.5 THEN 4.0
            WHEN v_score >= 8.0 THEN 3.5
            WHEN v_score >= 7.0 THEN 3.0
            WHEN v_score >= 6.5 THEN 2.5
            WHEN v_score >= 5.5 THEN 2.0
            WHEN v_score >= 5.0 THEN 1.0
            ELSE 0.0
          END;

          INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
          VALUES (
            v_enrollment_id,
            jsonb_build_object(
              'process', GREATEST(v_score - 0.5, 0),
              'midterm', GREATEST(v_score - 0.3, 0),
              'final', v_score
            ),
            v_score,
            v_letter,
            v_gpa
          );
        END LOOP;
      END LOOP;

    ELSIF v_scenario = 'GPA_DROP' THEN
      FOR sem_idx IN 1..6 LOOP
        FOR c_idx IN 1..4 LOOP
          SELECT id INTO v_course_id
          FROM courses
          WHERE code = 'TST' || LPAD((((i + sem_idx * 7 + c_idx) % 40) + 1)::text, 3, '0');

          IF sem_idx <= 5 THEN
            v_score := ROUND((7.8 + ((i + c_idx) % 15) / 10.0)::numeric, 1);
          ELSE
            v_score := ROUND((3.8 + ((i + c_idx) % 20) / 10.0)::numeric, 1);
          END IF;

          v_status := 'HOC_MOI';

          INSERT INTO enrollments (student_id, course_id, semester, status)
          VALUES (v_student_id, v_course_id, semesters_short[sem_idx], v_status)
          RETURNING id INTO v_enrollment_id;

          v_letter := CASE
            WHEN v_score >= 8.5 THEN 'A'
            WHEN v_score >= 8.0 THEN 'B+'
            WHEN v_score >= 7.0 THEN 'B'
            WHEN v_score >= 6.5 THEN 'C+'
            WHEN v_score >= 5.5 THEN 'C'
            WHEN v_score >= 5.0 THEN 'D'
            ELSE 'F'
          END;

          v_gpa := CASE
            WHEN v_score >= 8.5 THEN 4.0
            WHEN v_score >= 8.0 THEN 3.5
            WHEN v_score >= 7.0 THEN 3.0
            WHEN v_score >= 6.5 THEN 2.5
            WHEN v_score >= 5.5 THEN 2.0
            WHEN v_score >= 5.0 THEN 1.0
            ELSE 0.0
          END;

          INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
          VALUES (
            v_enrollment_id,
            jsonb_build_object(
              'process', GREATEST(v_score - 0.4, 0),
              'midterm', GREATEST(v_score - 0.2, 0),
              'final', v_score
            ),
            v_score,
            v_letter,
            v_gpa
          );
        END LOOP;
      END LOOP;

    ELSIF v_scenario = 'DELAY_GRAD' THEN
      FOR sem_idx IN 1..6 LOOP
        FOR c_idx IN 1..3 LOOP
          SELECT id INTO v_course_id
          FROM courses
          WHERE code = 'TST' || LPAD((((i + sem_idx * 2 + c_idx) % 40) + 1)::text, 3, '0');

          v_score := ROUND((5.5 + ((i + sem_idx + c_idx) % 25) / 10.0)::numeric, 1);
          v_status := 'HOC_MOI';

          INSERT INTO enrollments (student_id, course_id, semester, status)
          VALUES (v_student_id, v_course_id, semesters_short[sem_idx], v_status)
          RETURNING id INTO v_enrollment_id;

          v_letter := CASE
            WHEN v_score >= 8.5 THEN 'A'
            WHEN v_score >= 8.0 THEN 'B+'
            WHEN v_score >= 7.0 THEN 'B'
            WHEN v_score >= 6.5 THEN 'C+'
            WHEN v_score >= 5.5 THEN 'C'
            WHEN v_score >= 5.0 THEN 'D'
            ELSE 'F'
          END;

          v_gpa := CASE
            WHEN v_score >= 8.5 THEN 4.0
            WHEN v_score >= 8.0 THEN 3.5
            WHEN v_score >= 7.0 THEN 3.0
            WHEN v_score >= 6.5 THEN 2.5
            WHEN v_score >= 5.5 THEN 2.0
            WHEN v_score >= 5.0 THEN 1.0
            ELSE 0.0
          END;

          INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
          VALUES (
            v_enrollment_id,
            jsonb_build_object(
              'process', GREATEST(v_score - 0.5, 0),
              'midterm', GREATEST(v_score - 0.2, 0),
              'final', v_score
            ),
            v_score,
            v_letter,
            v_gpa
          );
        END LOOP;
      END LOOP;

    ELSE
      SELECT id INTO v_course_id FROM courses WHERE code = 'TST005';

      INSERT INTO enrollments (student_id, course_id, semester, status)
      VALUES (v_student_id, v_course_id, '2023-2', 'HOC_MOI')
      RETURNING id INTO v_enrollment_id;
      INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
      VALUES (v_enrollment_id, '{"process":4.2,"midterm":4.1,"final":4.0}', 4.0, 'F', 0);

      INSERT INTO enrollments (student_id, course_id, semester, status)
      VALUES (v_student_id, v_course_id, '2024-1', 'HOC_LAI')
      RETURNING id INTO v_enrollment_id;
      INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
      VALUES (v_enrollment_id, '{"process":4.5,"midterm":4.4,"final":4.6}', 4.6, 'F', 0);

      INSERT INTO enrollments (student_id, course_id, semester, status)
      VALUES (v_student_id, v_course_id, '2024-2', 'HOC_LAI')
      RETURNING id INTO v_enrollment_id;
      INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
      VALUES (v_enrollment_id, '{"process":5.2,"midterm":5.3,"final":5.5}', 5.5, 'C', 2.0);

      FOR sem_idx IN 1..6 LOOP
        FOR c_idx IN 1..3 LOOP
          SELECT id INTO v_course_id
          FROM courses
          WHERE code = 'TST' || LPAD((((i + sem_idx * 6 + c_idx + 5) % 40) + 1)::text, 3, '0');

          IF v_course_id <> (SELECT id FROM courses WHERE code = 'TST005') THEN
            v_score := ROUND((5.8 + ((i + sem_idx + c_idx) % 25) / 10.0)::numeric, 1);
            v_status := 'HOC_MOI';

            INSERT INTO enrollments (student_id, course_id, semester, status)
            VALUES (v_student_id, v_course_id, semesters_short[sem_idx], v_status)
            RETURNING id INTO v_enrollment_id;

            v_letter := CASE
              WHEN v_score >= 8.5 THEN 'A'
              WHEN v_score >= 8.0 THEN 'B+'
              WHEN v_score >= 7.0 THEN 'B'
              WHEN v_score >= 6.5 THEN 'C+'
              WHEN v_score >= 5.5 THEN 'C'
              WHEN v_score >= 5.0 THEN 'D'
              ELSE 'F'
            END;

            v_gpa := CASE
              WHEN v_score >= 8.5 THEN 4.0
              WHEN v_score >= 8.0 THEN 3.5
              WHEN v_score >= 7.0 THEN 3.0
              WHEN v_score >= 6.5 THEN 2.5
              WHEN v_score >= 5.5 THEN 2.0
              WHEN v_score >= 5.0 THEN 1.0
              ELSE 0.0
            END;

            INSERT INTO grades (enrollment_id, components_json, final_score, letter, gpa_points)
            VALUES (
              v_enrollment_id,
              jsonb_build_object(
                'process', GREATEST(v_score - 0.5, 0),
                'midterm', GREATEST(v_score - 0.2, 0),
                'final', v_score
              ),
              v_score,
              v_letter,
              v_gpa
            );
          END IF;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Query kiểm tra nhanh
SELECT COUNT(*) AS total_fake_students
FROM students
WHERE mssv LIKE 'FAKE%';

SELECT COUNT(*) AS total_fake_enrollments
FROM enrollments e
JOIN students s ON s.id = e.student_id
WHERE s.mssv LIKE 'FAKE%';

SELECT COUNT(*) AS total_fake_grades
FROM grades g
JOIN enrollments e ON e.id = g.enrollment_id
JOIN students s ON s.id = e.student_id
WHERE s.mssv LIKE 'FAKE%';
