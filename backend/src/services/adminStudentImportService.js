import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { pool } from '../db.js';

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeEmail(value, mssv) {
  const email = normalize(value).toLowerCase();
  return email || `${normalize(mssv).toLowerCase()}@uit.edu.vn`;
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map(normalize);
}

function parseCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  for (const field of ['mssv', 'full_name', 'class_code']) {
    if (!headers.includes(field)) {
      throw new Error(`File CSV thiếu cột bắt buộc: ${field}`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const row = { row_number: index + 2 };

    headers.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] || '';
    });

    return row;
  });
}

function generateTemporaryPassword() {
  return crypto.randomBytes(5).toString('base64url');
}

export async function importStudentAccountsForAdmin({ buffer }) {
  const rows = parseCsv(buffer);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const created = [];
    const updated = [];
    const skipped = [];
    const classesTouched = new Set();

    for (const row of rows) {
      const mssv = normalize(row.mssv);
      const fullName = normalize(row.full_name || row.name || row.ho_ten);
      const classCode = normalize(row.class_code);
      const cohort = normalize(row.cohort || '');
      const program = normalize(row.program || row.major || 'Chưa cập nhật');
      const className = normalize(row.class_name || classCode);
      const email = normalizeEmail(row.email, mssv);
      const phone = normalize(row.phone || '');

      if (!mssv || !fullName || !classCode) {
        skipped.push({
          row_number: row.row_number,
          mssv,
          reason: 'Thiếu MSSV, họ tên hoặc mã lớp.',
        });
        continue;
      }

      await client.query(
        `
        INSERT INTO admin_classes (code, name, cohort, program)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE
          SET name = COALESCE(NULLIF(EXCLUDED.name, ''), admin_classes.name),
              cohort = COALESCE(NULLIF(EXCLUDED.cohort, ''), admin_classes.cohort),
              program = COALESCE(NULLIF(EXCLUDED.program, ''), admin_classes.program)
        `,
        [classCode, className || classCode, cohort || 'Chưa cập nhật', program || 'Chưa cập nhật']
      );
      classesTouched.add(classCode);

      const studentResult = await client.query(
        `
        INSERT INTO students (mssv, full_name, email, phone, class_code, cohort)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (mssv) DO UPDATE
          SET full_name = EXCLUDED.full_name,
              email = COALESCE(EXCLUDED.email, students.email),
              phone = COALESCE(NULLIF(EXCLUDED.phone, ''), students.phone),
              class_code = EXCLUDED.class_code,
              cohort = COALESCE(NULLIF(EXCLUDED.cohort, ''), students.cohort)
        RETURNING id, mssv, full_name, email, class_code, cohort
        `,
        [mssv, fullName, email, phone || null, classCode, cohort || null]
      );

      const student = studentResult.rows[0];
      const existingUser = await client.query(
        `SELECT id, email FROM users WHERE student_id = $1 LIMIT 1`,
        [student.id]
      );

      if (existingUser.rows.length > 0) {
        updated.push({
          row_number: row.row_number,
          student,
          user_id: existingUser.rows[0].id,
          account_status: 'existing',
        });
        continue;
      }

      const emailConflict = await client.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (emailConflict.rows.length > 0) {
        skipped.push({
          row_number: row.row_number,
          mssv,
          reason: `Email ${email} đã thuộc tài khoản khác.`,
        });
        continue;
      }

      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      const userResult = await client.query(
        `
        INSERT INTO users (email, password_hash, full_name, role, student_id)
        VALUES ($1, $2, $3, 'STUDENT', $4)
        RETURNING id, email, full_name, role, student_id
        `,
        [email, passwordHash, fullName, student.id]
      );

      created.push({
        row_number: row.row_number,
        student,
        user: userResult.rows[0],
        temporary_password: temporaryPassword,
      });
    }

    await client.query('COMMIT');

    return {
      total_rows: rows.length,
      class_count: classesTouched.size,
      classes: [...classesTouched],
      created_count: created.length,
      updated_count: updated.length,
      skipped_count: skipped.length,
      created,
      updated,
      skipped,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
