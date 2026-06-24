import { pool } from '../db.js';
import { ensureStudentGradeImportSchema } from './studentGradeImportService.js';

function parseSemesterKey(semester) {
  const match = String(semester || '').match(/HK\s*(\d+)[-_ ](\d{4})/i);
  if (!match) return { year: 0, term: 0, order: 0 };

  const term = Number(match[1]);
  const year = Number(match[2]);
  return {
    year,
    term,
    order: year * 10 + term,
  };
}

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(digits));
}

function getGradeBucket(letterGrade, status) {
  if (status === 'ABSENT') return 'ABSENT';
  if (!letterGrade) return 'IN_PROGRESS';
  return letterGrade;
}

export async function getStudentMetricsForUser(userId) {
  await ensureStudentGradeImportSchema();

  const result = await pool.query(
    `
    SELECT
      s.id AS student_id,
      s.mssv,
      s.full_name,
      s.class_code,
      e.semester,
      c.code AS course_code,
      c.name AS course_name,
      c.credits,
      g.letter_grade,
      g.numeric_grade,
      g.gpa_points,
      COALESCE(g.status, 'GRADED') AS status
    FROM users u
    JOIN students s ON s.id = u.student_id
    JOIN enrollments e ON e.student_id = s.id
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    WHERE u.id = $1
    ORDER BY e.semester ASC, c.code ASC
    `,
    [userId]
  );

  const student = result.rows[0]
    ? {
        id: result.rows[0].student_id,
        mssv: result.rows[0].mssv,
        full_name: result.rows[0].full_name,
        class_code: result.rows[0].class_code,
      }
    : null;

  const bySemesterMap = new Map();
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
    const semester = row.semester || 'UNKNOWN';
    if (!bySemesterMap.has(semester)) {
      const parsed = parseSemesterKey(semester);
      bySemesterMap.set(semester, {
        semester,
        order: parsed.order,
        courses: 0,
        graded_courses: 0,
        failed: 0,
        absent: 0,
        in_progress: 0,
        credits_total: 0,
        credits_earned: 0,
        credits_debt: 0,
        weighted_gpa_sum: 0,
        weighted_numeric_sum: 0,
        graded_credits: 0,
      });
    }

    const item = bySemesterMap.get(semester);
    const credits = Number(row.credits || 0);
    const status = row.status || 'IN_PROGRESS';
    const letterGrade = row.letter_grade || null;
    const gpaPoints = row.gpa_points === null ? null : Number(row.gpa_points);
    const numericGrade = row.numeric_grade === null ? null : Number(row.numeric_grade);
    const bucket = getGradeBucket(letterGrade, status);

    if (gradeDistribution[bucket] !== undefined) gradeDistribution[bucket] += 1;

    item.courses += 1;
    item.credits_total += credits;

    if (status === 'ABSENT') {
      item.absent += 1;
      item.credits_debt += credits;
      continue;
    }

    if (status !== 'GRADED') {
      item.in_progress += 1;
      continue;
    }

    item.graded_courses += 1;
    item.graded_credits += credits;

    if (letterGrade === 'F') {
      item.failed += 1;
      item.credits_debt += credits;
    } else {
      item.credits_earned += credits;
    }

    if (gpaPoints !== null && Number.isFinite(gpaPoints)) {
      item.weighted_gpa_sum += gpaPoints * credits;
    }

    if (numericGrade !== null && Number.isFinite(numericGrade)) {
      item.weighted_numeric_sum += numericGrade * credits;
    }
  }

  const bySemester = [...bySemesterMap.values()]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      semester: item.semester,
      gpa: item.graded_credits > 0 ? round(item.weighted_gpa_sum / item.graded_credits) : null,
      avg_numeric: item.graded_credits > 0 ? round(item.weighted_numeric_sum / item.graded_credits) : null,
      credits_total: item.credits_total,
      credits_earned: item.credits_earned,
      credits_debt: item.credits_debt,
      failed: item.failed,
      absent: item.absent,
      in_progress: item.in_progress,
      courses: item.courses,
      graded_courses: item.graded_courses,
      gpa_drop: false,
      gpa_delta: null,
      commendation: null,
    }));

  let cumulativeWeightedGpa = 0;
  let cumulativeWeightedNumeric = 0;
  let cumulativeCredits = 0;
  let previousGpa = null;
  let bestPreviousGpa = null;
  const droppedSemesters = [];
  const commendations = [];

  for (const semester of bySemester) {
    const source = bySemesterMap.get(semester.semester);
    cumulativeWeightedGpa += source.weighted_gpa_sum;
    cumulativeWeightedNumeric += source.weighted_numeric_sum;
    cumulativeCredits += source.graded_credits;

    semester.cumulative_gpa = cumulativeCredits > 0 ? round(cumulativeWeightedGpa / cumulativeCredits) : null;
    semester.cumulative_avg_numeric = cumulativeCredits > 0 ? round(cumulativeWeightedNumeric / cumulativeCredits) : null;

    if (semester.gpa !== null && previousGpa !== null) {
      semester.gpa_delta = round(semester.gpa - previousGpa);

      if (previousGpa - semester.gpa >= 0.5) {
        semester.gpa_drop = true;
        droppedSemesters.push(semester.semester);
      }

      if (semester.gpa - previousGpa >= 0.3) {
        semester.commendation = 'Tiến bộ';
        commendations.push({
          semester: semester.semester,
          label: 'Tiến bộ',
          reason: `GPA tăng ${round(semester.gpa - previousGpa)} so với học kỳ trước.`,
        });
      }
    }

    if (semester.gpa !== null && bestPreviousGpa !== null && semester.gpa > bestPreviousGpa) {
      semester.commendation = 'Tuyên dương';
      commendations.push({
        semester: semester.semester,
        label: 'Tuyên dương',
        reason: 'GPA học kỳ vượt mức cao nhất trước đó.',
      });
    }

    if (semester.gpa !== null) {
      previousGpa = semester.gpa;
      bestPreviousGpa = bestPreviousGpa === null ? semester.gpa : Math.max(bestPreviousGpa, semester.gpa);
    }
  }

  const latestSemester = [...bySemester].reverse().find((item) => item.gpa !== null) || null;

  return {
    student,
    cumulative_gpa: latestSemester?.cumulative_gpa ?? null,
    cumulative_avg_numeric: latestSemester?.cumulative_avg_numeric ?? null,
    by_semester: bySemester,
    grade_distribution: gradeDistribution,
    dropped_semesters: droppedSemesters,
    improving: commendations.length > 0,
    commendations,
  };
}
