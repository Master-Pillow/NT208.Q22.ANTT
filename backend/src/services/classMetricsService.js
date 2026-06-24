import { pool } from '../db.js';
import { ensureStudentGradeImportSchema } from './studentGradeImportService.js';

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(digits));
}

function parseSemesterKey(semester) {
  const match = String(semester || '').match(/HK\s*(\d+)[-_ ](\d{4})/i);
  if (!match) return 0;
  return Number(match[2]) * 10 + Number(match[1]);
}

function bucketForGpa(gpa) {
  if (gpa === null || gpa === undefined) return null;
  if (gpa < 2) return '<2.0';
  if (gpa < 2.5) return '2.0-2.49';
  if (gpa < 3) return '2.5-2.99';
  if (gpa < 3.5) return '3.0-3.49';
  return '>=3.5';
}

function gradeBucket(letterGrade, status) {
  if (status === 'ABSENT') return 'ABSENT';
  if (!letterGrade) return 'IN_PROGRESS';
  return letterGrade;
}

function weightedAverage(sum, credits) {
  return credits > 0 ? round(sum / credits) : null;
}

export async function advisorCanAccessClass(advisorId, classCode) {
  const result = await pool.query(
    `
    SELECT 1
    FROM advisor_class
    WHERE advisor_id = $1 AND class_code = $2
    LIMIT 1
    `,
    [advisorId, classCode]
  );

  return result.rows.length > 0;
}

export async function getClassMetrics(classCode) {
  await ensureStudentGradeImportSchema();

  const classResult = await pool.query(
    `
    SELECT code, name, cohort, program
    FROM admin_classes
    WHERE code = $1
    LIMIT 1
    `,
    [classCode]
  );

  const classInfo = classResult.rows[0] || { code: classCode };

  const result = await pool.query(
    `
    SELECT
      s.id AS student_id,
      s.full_name,
      s.mssv,
      s.class_code,
      e.semester,
      c.code AS course_code,
      c.name AS course_name,
      c.credits,
      g.letter_grade,
      g.numeric_grade,
      g.gpa_points,
      COALESCE(g.status, 'GRADED') AS status
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id
    LEFT JOIN courses c ON c.id = e.course_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    WHERE s.class_code = $1
    ORDER BY s.full_name ASC, e.semester ASC, c.code ASC
    `,
    [classCode]
  );

  const students = new Map();
  const semesters = new Map();
  const courses = new Map();
  const gradeDistribution = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
    ABSENT: 0,
    IN_PROGRESS: 0,
  };

  for (const row of result.rows) {
    if (!students.has(row.student_id)) {
      students.set(row.student_id, {
        id: row.student_id,
        full_name: row.full_name,
        mssv: row.mssv,
        weighted_gpa: 0,
        weighted_numeric: 0,
        credits: 0,
        failed: 0,
        absent: 0,
        bySemester: new Map(),
      });
    }

    if (!row.course_code || !row.semester) continue;

    const student = students.get(row.student_id);
    const credits = Number(row.credits || 0);
    const status = row.status || 'IN_PROGRESS';
    const letterGrade = row.letter_grade || null;
    const gpa = row.gpa_points === null ? null : Number(row.gpa_points);
    const numeric = row.numeric_grade === null ? null : Number(row.numeric_grade);
    const bucket = gradeBucket(letterGrade, status);

    if (gradeDistribution[bucket] !== undefined) gradeDistribution[bucket] += 1;

    if (!semesters.has(row.semester)) {
      semesters.set(row.semester, {
        semester: row.semester,
        order: parseSemesterKey(row.semester),
        weighted_gpa: 0,
        weighted_numeric: 0,
        credits: 0,
        failed: 0,
        absent: 0,
        total_courses: 0,
      });
    }

    if (!courses.has(row.course_code)) {
      courses.set(row.course_code, {
        code: row.course_code,
        name: row.course_name,
        total: 0,
        failed: 0,
        absent: 0,
      });
    }

    const semester = semesters.get(row.semester);
    const course = courses.get(row.course_code);
    course.total += 1;
    semester.total_courses += 1;

    if (status === 'ABSENT') {
      student.absent += 1;
      semester.absent += 1;
      course.absent += 1;
      continue;
    }

    if (status !== 'GRADED') continue;

    if (letterGrade === 'F') {
      student.failed += 1;
      semester.failed += 1;
      course.failed += 1;
    }

    if (gpa !== null) {
      student.weighted_gpa += gpa * credits;
      student.credits += credits;
      semester.weighted_gpa += gpa * credits;
      semester.credits += credits;
    }

    if (numeric !== null) {
      student.weighted_numeric += numeric * credits;
      semester.weighted_numeric += numeric * credits;
    }

    if (!student.bySemester.has(row.semester)) {
      student.bySemester.set(row.semester, {
        semester: row.semester,
        order: parseSemesterKey(row.semester),
        weighted_gpa: 0,
        credits: 0,
      });
    }

    const studentSemester = student.bySemester.get(row.semester);
    if (gpa !== null) {
      studentSemester.weighted_gpa += gpa * credits;
      studentSemester.credits += credits;
    }
  }

  const studentRows = [...students.values()].map((student) => {
    const semesterRows = [...student.bySemester.values()]
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        semester: item.semester,
        gpa: weightedAverage(item.weighted_gpa, item.credits),
      }))
      .filter((item) => item.gpa !== null);

    const latest = semesterRows[semesterRows.length - 1] || null;
    const previous = semesterRows[semesterRows.length - 2] || null;

    return {
      id: student.id,
      full_name: student.full_name,
      mssv: student.mssv,
      gpa: weightedAverage(student.weighted_gpa, student.credits),
      avg_numeric: weightedAverage(student.weighted_numeric, student.credits),
      failed: student.failed,
      absent: student.absent,
      latest_semester: latest?.semester || null,
      gpa_delta: latest && previous ? round(latest.gpa - previous.gpa) : null,
    };
  });

  const totalStudents = studentRows.length;
  const studentsWithGpa = studentRows.filter((student) => student.gpa !== null);
  const avgGpa = studentsWithGpa.length
    ? round(studentsWithGpa.reduce((sum, student) => sum + Number(student.gpa), 0) / studentsWithGpa.length)
    : null;

  const atRiskCount = studentRows.filter((student) => Number(student.gpa || 0) < 2 || student.failed > 0 || student.absent > 0).length;
  const failedStudents = studentRows.filter((student) => student.failed > 0 || student.absent > 0).length;

  const gpaHistogram = ['<2.0', '2.0-2.49', '2.5-2.99', '3.0-3.49', '>=3.5'].map((bucket) => ({
    bucket,
    count: studentsWithGpa.filter((student) => bucketForGpa(student.gpa) === bucket).length,
  }));

  const gpaBySemester = [...semesters.values()]
    .sort((a, b) => a.order - b.order)
    .map((semester) => ({
      semester: semester.semester,
      avg_gpa: weightedAverage(semester.weighted_gpa, semester.credits),
      avg_numeric: weightedAverage(semester.weighted_numeric, semester.credits),
      fail_rate: semester.total_courses > 0 ? round(((semester.failed + semester.absent) / semester.total_courses) * 100, 1) : 0,
      failed: semester.failed,
      absent: semester.absent,
    }));

  const failrateByCourse = [...courses.values()]
    .map((course) => ({
      code: course.code,
      name: course.name,
      total: course.total,
      failed: course.failed,
      absent: course.absent,
      fail_rate: course.total > 0 ? round(((course.failed + course.absent) / course.total) * 100, 1) : 0,
    }))
    .filter((course) => course.total > 0)
    .sort((a, b) => b.fail_rate - a.fail_rate || b.failed - a.failed)
    .slice(0, 8);

  const topImproving = studentRows
    .filter((student) => student.gpa_delta !== null && student.gpa_delta > 0)
    .sort((a, b) => Number(b.gpa_delta) - Number(a.gpa_delta))
    .slice(0, 5);

  const topDeclining = studentRows
    .filter((student) => student.gpa_delta !== null && student.gpa_delta < 0)
    .sort((a, b) => Number(a.gpa_delta) - Number(b.gpa_delta))
    .slice(0, 5);

  return {
    class_info: classInfo,
    total_students: totalStudents,
    avg_gpa: avgGpa,
    fail_rate: totalStudents > 0 ? round((failedStudents / totalStudents) * 100, 1) : 0,
    at_risk_count: atRiskCount,
    grade_distribution: gradeDistribution,
    gpa_by_semester: gpaBySemester,
    failrate_by_course: failrateByCourse,
    gpa_histogram: gpaHistogram,
    top_improving: topImproving,
    top_declining: topDeclining,
  };
}
