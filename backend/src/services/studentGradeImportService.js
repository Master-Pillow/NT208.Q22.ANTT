import crypto from 'node:crypto';
import { pool } from '../db.js';
import { numericToGpaPoints } from './studentGradePdfService.js';

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function safeNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function ensureStudentGradeImportSchema(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS student_grade_imports (
      id BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      mssv VARCHAR(50) NOT NULL,
      source VARCHAR(50) NOT NULL DEFAULT 'uit-portal-pdf',
      raw_payload JSONB NOT NULL,
      normalized_payload JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IMPORTED', 'FAILED')),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      imported_at TIMESTAMPTZ
    )
  `);

  await client.query(`
    ALTER TABLE grades
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'GRADED'
      CHECK (status IN ('GRADED', 'IN_PROGRESS', 'ABSENT'))
  `);

  await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS source VARCHAR(50)`);
  await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS source_hash VARCHAR(64)`);
  await client.query(`ALTER TABLE grades ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ`);
}

export async function getCurrentStudent(user) {
  const result = await pool.query(
    `
    SELECT s.id, s.mssv, s.full_name, s.class_code, u.role
    FROM users u
    JOIN students s ON s.id = u.student_id
    WHERE u.id = $1
    LIMIT 1
    `,
    [user.id]
  );

  const student = result.rows[0];
  if (!student || normalizeRole(student.role) !== 'STUDENT') return null;
  return student;
}

export async function createStudentGradeImport({ student, payload }) {
  await ensureStudentGradeImportSchema();

  const mssv = normalizeText(payload.student?.mssv || '');
  const mismatch = mssv && normalizeText(student.mssv) !== mssv;
  const status = mismatch ? 'FAILED' : 'PENDING';
  const errorMessage = mismatch
    ? `MSSV trong PDF (${mssv}) không trùng với tài khoản đang đăng nhập (${student.mssv}).`
    : null;

  const result = await pool.query(
    `
    INSERT INTO student_grade_imports (
      student_id,
      mssv,
      source,
      raw_payload,
      normalized_payload,
      status,
      error_message
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, status, error_message, created_at
    `,
    [
      student.id,
      mssv || student.mssv,
      payload.source || 'uit-portal-pdf',
      payload,
      payload,
      status,
      errorMessage,
    ]
  );

  return {
    import: result.rows[0],
    mismatch,
    error_message: errorMessage,
  };
}

export async function importStudentGrades({ importId, user }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureStudentGradeImportSchema(client);

    const studentResult = await client.query(
      `
      SELECT s.id, s.mssv, s.full_name
      FROM users u
      JOIN students s ON s.id = u.student_id
      WHERE u.id = $1
      LIMIT 1
      `,
      [user.id]
    );

    const student = studentResult.rows[0];
    if (!student) {
      await client.query('ROLLBACK');
      return { status: 403, body: { message: 'Chỉ sinh viên mới được import bảng điểm.' } };
    }

    const importResult = await client.query(
      `
      SELECT *
      FROM student_grade_imports
      WHERE id = $1 AND student_id = $2
      FOR UPDATE
      `,
      [importId, student.id]
    );

    const gradeImport = importResult.rows[0];
    if (!gradeImport) {
      await client.query('ROLLBACK');
      return { status: 404, body: { message: 'Không tìm thấy lần import bảng điểm.' } };
    }

    if (gradeImport.status === 'FAILED') {
      await client.query('ROLLBACK');
      return { status: 400, body: { message: gradeImport.error_message || 'Lần import không hợp lệ.' } };
    }

    const payload = gradeImport.normalized_payload;
    const pdfMssv = normalizeText(payload.student?.mssv || '');
    if (pdfMssv !== normalizeText(student.mssv)) {
      const message = `MSSV trong PDF (${pdfMssv || 'không rõ'}) không trùng với tài khoản đang đăng nhập (${student.mssv}).`;
      await client.query(
        `UPDATE student_grade_imports SET status = 'FAILED', error_message = $1 WHERE id = $2`,
        [message, importId]
      );
      await client.query('COMMIT');
      return { status: 403, body: { message } };
    }

    let importedCount = 0;
    let skippedCount = 0;
    const sourceHash = hashPayload(payload);

    for (const course of payload.courses || []) {
      const code = normalizeText(course.course_code);
      const name = normalizeText(course.course_name);
      const credits = Number(course.credits || 0);
      const semester = normalizeText(course.semester);

      if (!code || !name || !credits || !semester) {
        skippedCount += 1;
        continue;
      }

      const courseResult = await client.query(
        `
        INSERT INTO courses (code, name, credits)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO UPDATE
          SET name = COALESCE(NULLIF(EXCLUDED.name, ''), courses.name),
              credits = EXCLUDED.credits
        RETURNING id
        `,
        [code, name, credits]
      );

      const courseId = courseResult.rows[0].id;

      const enrollmentResult = await client.query(
        `
        INSERT INTO enrollments (student_id, course_id, semester)
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id, course_id, semester) DO UPDATE
          SET semester = EXCLUDED.semester
        RETURNING id
        `,
        [student.id, courseId, semester]
      );

      const enrollmentId = enrollmentResult.rows[0].id;
      const numericGrade = safeNumeric(course.numeric_grade);
      const parsedStatus = normalizeText(course.status || 'IN_PROGRESS');
      const status = parsedStatus === 'EXEMPT' ? 'IN_PROGRESS' : parsedStatus;
      const letterGrade = status === 'GRADED' ? course.letter_grade || null : null;
      const gpaPoints = status === 'GRADED' ? safeNumeric(course.gpa_points ?? numericToGpaPoints(numericGrade)) : null;

      await client.query(
        `
        INSERT INTO grades (
          enrollment_id,
          letter_grade,
          numeric_grade,
          gpa_points,
          status,
          source,
          source_hash,
          imported_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (enrollment_id) DO UPDATE
          SET letter_grade = EXCLUDED.letter_grade,
              numeric_grade = EXCLUDED.numeric_grade,
              gpa_points = EXCLUDED.gpa_points,
              status = EXCLUDED.status,
              source = EXCLUDED.source,
              source_hash = EXCLUDED.source_hash,
              imported_at = NOW()
        `,
        [
          enrollmentId,
          letterGrade,
          numericGrade,
          gpaPoints,
          status,
          payload.source || 'uit-portal-pdf',
          sourceHash,
        ]
      );

      importedCount += 1;
    }

    await client.query(
      `
      UPDATE student_grade_imports
      SET status = 'IMPORTED', imported_at = NOW(), error_message = NULL
      WHERE id = $1
      `,
      [importId]
    );

    await client.query('COMMIT');

    return {
      status: 200,
      body: {
        message: 'Import bảng điểm thành công.',
        imported_count: importedCount,
        skipped_count: skippedCount,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
