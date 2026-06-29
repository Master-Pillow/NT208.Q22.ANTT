import { pool } from '../db.js';

// ============================================================================
// studentScheduleImportService — lưu snapshot TKB + Lịch thi vào DB.
//
// Chiến lược "replace snapshot": mỗi lần đồng bộ sẽ xoá toàn bộ entry cũ của
// (student_id, semester) rồi insert lại, vì lịch có thể thay đổi/biến mất giữa
// các lần đồng bộ. Toàn bộ trong 1 transaction.
// ============================================================================

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export async function ensureStudentScheduleSchema(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS student_schedule_entries (
      id BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      semester VARCHAR(20) NOT NULL,
      course_code VARCHAR(50),
      class_code VARCHAR(100) NOT NULL,
      course_name TEXT,
      room VARCHAR(100),
      lecturer TEXT,
      lecturer_code VARCHAR(20),
      day_of_week SMALLINT NOT NULL,
      start_period SMALLINT,
      end_period SMALLINT,
      start_date DATE,
      end_date DATE,
      weeks_note TEXT,
      source VARCHAR(50) NOT NULL DEFAULT 'uit-daa-session',
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_schedule_student_semester
      ON student_schedule_entries (student_id, semester)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS student_exam_entries (
      id BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      semester VARCHAR(20) NOT NULL,
      exam_term VARCHAR(10),
      course_code VARCHAR(50),
      class_code VARCHAR(100),
      exam_slot VARCHAR(50),
      day_of_week SMALLINT,
      exam_date DATE,
      room VARCHAR(100),
      exam_format VARCHAR(50),
      note TEXT,
      source VARCHAR(50) NOT NULL DEFAULT 'uit-daa-session',
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_exam_student_semester
      ON student_exam_entries (student_id, semester)
  `);
}

export async function saveStudentTimetable({ studentId, payload }) {
  const entries = (payload?.entries || []).filter((e) => e.semester && e.class_code);
  if (!entries.length) return { imported_count: 0, semester: payload?.semester || null };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureStudentScheduleSchema(client);

    const semesters = [...new Set(entries.map((e) => normalizeText(e.semester)))];
    await client.query(
      `DELETE FROM student_schedule_entries WHERE student_id = $1 AND semester = ANY($2::varchar[])`,
      [studentId, semesters]
    );

    for (const e of entries) {
      await client.query(
        `
        INSERT INTO student_schedule_entries (
          student_id, semester, course_code, class_code, course_name,
          room, lecturer, lecturer_code, day_of_week, start_period, end_period,
          start_date, end_date, weeks_note, source
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        `,
        [
          studentId,
          normalizeText(e.semester),
          e.course_code || null,
          normalizeText(e.class_code),
          e.course_name || null,
          e.room || null,
          e.lecturer || null,
          e.lecturer_code || null,
          e.day_of_week,
          e.start_period || null,
          e.end_period || null,
          e.start_date || null,
          e.end_date || null,
          e.weeks_note || null,
          payload.source || 'uit-daa-session',
        ]
      );
    }

    await client.query('COMMIT');
    return { imported_count: entries.length, semester: semesters[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveStudentExams({ studentId, payload }) {
  const entries = (payload?.entries || []).filter((e) => e.semester && e.course_code);
  if (!entries.length) return { imported_count: 0, semester: payload?.semester || null };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureStudentScheduleSchema(client);

    const semesters = [...new Set(entries.map((e) => normalizeText(e.semester)))];
    const terms = [...new Set(entries.map((e) => normalizeText(e.exam_term || '')))];
    await client.query(
      `DELETE FROM student_exam_entries
       WHERE student_id = $1 AND semester = ANY($2::varchar[])
         AND COALESCE(exam_term, '') = ANY($3::varchar[])`,
      [studentId, semesters, terms]
    );

    for (const e of entries) {
      await client.query(
        `
        INSERT INTO student_exam_entries (
          student_id, semester, exam_term, course_code, class_code,
          exam_slot, day_of_week, exam_date, room, exam_format, note, source
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `,
        [
          studentId,
          normalizeText(e.semester),
          e.exam_term || null,
          e.course_code || null,
          e.class_code || null,
          e.exam_slot || null,
          e.day_of_week || null,
          e.exam_date || null,
          e.room || null,
          e.exam_format || null,
          e.note || null,
          payload.source || 'uit-daa-session',
        ]
      );
    }

    await client.query('COMMIT');
    return { imported_count: entries.length, semester: semesters[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getStudentTimetable(studentId, semester) {
  await ensureStudentScheduleSchema();
  const params = [studentId];
  let where = 'WHERE student_id = $1';
  if (semester) {
    params.push(semester);
    where += ' AND semester = $2';
  }
  const result = await pool.query(
    `
    SELECT semester, course_code, class_code, course_name, room, lecturer,
           lecturer_code, day_of_week, start_period, end_period,
           TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
           TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
           weeks_note, imported_at
    FROM student_schedule_entries
    ${where}
    ORDER BY day_of_week ASC, start_period ASC
    `,
    params
  );
  return result.rows;
}

export async function getStudentExams(studentId, semester) {
  await ensureStudentScheduleSchema();
  const params = [studentId];
  let where = 'WHERE student_id = $1';
  if (semester) {
    params.push(semester);
    where += ' AND semester = $2';
  }
  const result = await pool.query(
    `
    SELECT semester, exam_term, course_code, class_code, exam_slot,
           day_of_week, TO_CHAR(exam_date, 'YYYY-MM-DD') AS exam_date,
           room, exam_format, note, imported_at
    FROM student_exam_entries
    ${where}
    ORDER BY exam_date ASC NULLS LAST, course_code ASC
    `,
    params
  );
  return result.rows;
}
