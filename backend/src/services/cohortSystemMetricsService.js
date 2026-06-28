import { pool } from '../db.js';
import { ensureStudentGradeImportSchema } from './studentGradeImportService.js';
import { ensureAiTables } from './anomalyDetectionService.js';

function round(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(digits));
}

function parseSemesterKey(semester) {
  const match = String(semester || '').match(/HK\s*(\d+)[-_ ](\d{4})/i);
  if (!match) return 0;
  return Number(match[2]) * 10 + Number(match[1]);
}

function yearOf(semester) {
  const match = String(semester || '').match(/(\d{4})/);
  return match ? match[1] : 'N/A';
}

function gradeBucket(letterGrade, status) {
  if (status === 'ABSENT') return 'ABSENT';
  if (!letterGrade) return 'IN_PROGRESS';
  return letterGrade;
}

const ANOMALY_TYPE_LABEL = {
  LOW_GPA: 'GPA dưới ngưỡng',
  MULTIPLE_FAILURES: 'Nhiều môn rớt',
  COURSE_FAILURE: 'Rớt môn',
  GPA_DROP: 'GPA tụt mạnh',
  LOW_ACCUMULATED_CREDITS: 'Chậm tích lũy tín chỉ',
};

/**
 * Tải các dòng điểm (đã JOIN) theo phạm vi và gom thành các nhóm thống kê dùng chung
 * cho cả cấp khoá lẫn toàn trường. Tính bằng cách load 1 lần rồi GROUP trong JS,
 * nhất quán với classMetricsService / studentMetricsService.
 */
async function loadSummary({ cohort = null, advisorId = null } = {}) {
  await ensureStudentGradeImportSchema();

  const params = [];
  const conds = [];
  if (cohort) {
    params.push(cohort);
    conds.push(`s.cohort = $${params.length}`);
  }
  if (advisorId) {
    params.push(advisorId);
    conds.push(
      `s.class_code IN (SELECT class_code FROM advisor_class WHERE advisor_id = $${params.length})`
    );
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const result = await pool.query(
    `
    SELECT
      s.id AS student_id,
      s.class_code,
      s.cohort,
      s.status AS student_status,
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
    ${where}
    `,
    params
  );

  const students = new Map();
  const byYear = new Map();
  const bySemester = new Map();
  const byClass = new Map();
  const byCohort = new Map();
  const byCourse = new Map();
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0, ABSENT: 0, IN_PROGRESS: 0 };

  const touch = (map, key, seed) => {
    if (!map.has(key)) map.set(key, { key, ...seed });
    return map.get(key);
  };

  for (const row of result.rows) {
    if (!students.has(row.student_id)) {
      students.set(row.student_id, {
        id: row.student_id,
        class_code: row.class_code,
        cohort: row.cohort,
        stored_status: row.student_status,
        weighted_gpa: 0,
        credits: 0,
        failed: 0,
        absent: 0,
        graded_courses: 0,
      });
    }
    const student = students.get(row.student_id);

    if (!row.semester || !row.credits) continue;

    const credits = Number(row.credits || 0);
    const status = row.status || 'IN_PROGRESS';
    const gpa = row.gpa_points === null ? null : Number(row.gpa_points);
    const bucket = gradeBucket(row.letter_grade || null, status);
    if (gradeDistribution[bucket] !== undefined) gradeDistribution[bucket] += 1;

    const yearKey = yearOf(row.semester);
    const year = touch(byYear, yearKey, {
      weighted_gpa: 0, credits: 0, total_courses: 0, failed: 0, absent: 0,
    });
    const semester = touch(bySemester, row.semester, {
      order: parseSemesterKey(row.semester),
      weighted_gpa: 0, credits: 0, total_courses: 0, failed: 0, absent: 0,
    });
    const klass = touch(byClass, row.class_code || '—', {
      weighted_gpa: 0, credits: 0, total_courses: 0, failed: 0, absent: 0,
      student_ids: new Set(),
    });
    const cohortGroup = touch(byCohort, row.cohort || 'N/A', {
      weighted_gpa: 0, credits: 0, total_courses: 0, failed: 0, absent: 0,
      student_ids: new Set(),
    });
    const course = row.course_code
      ? touch(byCourse, row.course_code, {
          name: row.course_name, total: 0, failed: 0, absent: 0,
        })
      : null;

    for (const group of [year, semester, klass, cohortGroup]) {
      group.total_courses += 1;
    }
    if (course) course.total += 1;
    klass.student_ids.add(row.student_id);
    cohortGroup.student_ids.add(row.student_id);

    if (status === 'ABSENT') {
      student.absent += 1;
      year.absent += 1; semester.absent += 1; klass.absent += 1; cohortGroup.absent += 1;
      if (course) course.absent += 1;
      continue;
    }
    if (status !== 'GRADED') continue;

    student.graded_courses += 1;
    if (row.letter_grade === 'F') {
      student.failed += 1;
      year.failed += 1; semester.failed += 1; klass.failed += 1; cohortGroup.failed += 1;
      if (course) course.failed += 1;
    }
    if (gpa !== null) {
      student.weighted_gpa += gpa * credits;
      student.credits += credits;
      year.weighted_gpa += gpa * credits; year.credits += credits;
      semester.weighted_gpa += gpa * credits; semester.credits += credits;
      klass.weighted_gpa += gpa * credits; klass.credits += credits;
      cohortGroup.weighted_gpa += gpa * credits; cohortGroup.credits += credits;
    }
  }

  return { students, byYear, bySemester, byClass, byCohort, byCourse, gradeDistribution };
}

function failrateByCourse(byCourse, limit = 8) {
  return [...byCourse.values()]
    .map((c) => ({
      name: c.name,
      total: c.total,
      failed: c.failed,
      absent: c.absent,
      fail_rate: c.total > 0 ? round(((c.failed + c.absent) / c.total) * 100, 1) : 0,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.fail_rate - a.fail_rate || b.failed - a.failed)
    .slice(0, limit);
}

function studentGpaRows(students) {
  return [...students.values()].map((s) => ({
    id: s.id,
    class_code: s.class_code,
    cohort: s.cohort,
    stored_status: s.stored_status,
    gpa: s.credits > 0 ? round(s.weighted_gpa / s.credits) : null,
    failed: s.failed,
    absent: s.absent,
    has_grades: s.graded_courses > 0,
  }));
}

function avgGpaOf(rows) {
  const withGpa = rows.filter((r) => r.gpa !== null);
  if (!withGpa.length) return null;
  return round(withGpa.reduce((sum, r) => sum + Number(r.gpa), 0) / withGpa.length);
}

function atRiskCount(rows) {
  return rows.filter((r) => r.has_grades && (Number(r.gpa || 0) < 2 || r.failed > 0 || r.absent > 0)).length;
}

function failRatePercent(group) {
  return group.total_courses > 0
    ? round(((group.failed + group.absent) / group.total_courses) * 100, 1)
    : 0;
}

/** Cấp KHOÁ (K1–K4): GPA theo năm, tỷ lệ rớt theo năm, so sánh lớp, phân bố điểm. */
export async function getCohortMetrics(cohort) {
  const { students, byYear, byClass, gradeDistribution } = await loadSummary({ cohort });
  const rows = studentGpaRows(students);

  const years = [...byYear.values()].sort((a, b) => Number(a.key) - Number(b.key));

  const gpaByYear = years.map((y) => ({
    year: y.key,
    avg_gpa: y.credits > 0 ? round(y.weighted_gpa / y.credits) : null,
  }));

  const failrateByYear = years.map((y) => ({
    year: y.key,
    fail_rate: failRatePercent(y),
  }));

  const classesCompare = [...byClass.values()]
    .map((k) => ({
      class_code: k.key,
      total_students: k.student_ids.size,
      avg_gpa: k.credits > 0 ? round(k.weighted_gpa / k.credits) : null,
      fail_rate: failRatePercent(k),
    }))
    .sort((a, b) => (b.avg_gpa || 0) - (a.avg_gpa || 0));

  return {
    scope: 'cohort',
    cohort,
    total_students: students.size,
    avg_gpa: avgGpaOf(rows),
    at_risk_count: atRiskCount(rows),
    total_classes: byClass.size,
    grade_distribution: gradeDistribution,
    gpa_by_year: gpaByYear,
    failrate_by_year: failrateByYear,
    classes_compare: classesCompare,
  };
}

async function getAnomaliesByType({ advisorId = null } = {}) {
  try {
    await ensureAiTables(pool);
    const params = [];
    let advisorClause = '';
    if (advisorId) {
      params.push(advisorId);
      advisorClause = ` AND s.class_code IN (SELECT class_code FROM advisor_class WHERE advisor_id = $1)`;
    }
    const result = await pool.query(
      `
      SELECT a.anomaly_type, COUNT(*)::int AS count
      FROM ai_student_anomalies a
      JOIN students s ON s.id = a.student_id
      WHERE a.status = 'OPEN'${advisorClause}
      GROUP BY a.anomaly_type
      ORDER BY count DESC
      `,
      params
    );
    return result.rows.map((r) => ({
      type: r.anomaly_type,
      label: ANOMALY_TYPE_LABEL[r.anomaly_type] || r.anomaly_type,
      count: r.count,
    }));
  } catch (err) {
    console.error('[metrics] Không lấy được anomalies_by_type:', err.message);
    return [];
  }
}

/** Cấp CỐ VẤN: gộp toàn bộ lớp một cố vấn phụ trách để theo dõi tổng thể. */
export async function getAdvisorMetrics(advisorId) {
  const { students, bySemester, byClass, byCourse, gradeDistribution } = await loadSummary({ advisorId });
  const rows = studentGpaRows(students);

  const statusDistribution = { ACTIVE: 0, AT_RISK: 0, NO_DATA: 0 };
  for (const r of rows) {
    if (!r.has_grades) statusDistribution.NO_DATA += 1;
    else if (Number(r.gpa || 0) < 2 || r.failed > 0 || r.absent > 0) statusDistribution.AT_RISK += 1;
    else statusDistribution.ACTIVE += 1;
  }

  const gpaTrendBySemester = [...bySemester.values()]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      semester: s.key,
      avg_gpa: s.credits > 0 ? round(s.weighted_gpa / s.credits) : null,
      fail_rate: failRatePercent(s),
    }));

  const classesCompare = [...byClass.values()]
    .map((k) => ({
      class_code: k.key,
      total_students: k.student_ids.size,
      avg_gpa: k.credits > 0 ? round(k.weighted_gpa / k.credits) : null,
      fail_rate: failRatePercent(k),
    }))
    .sort((a, b) => (b.avg_gpa || 0) - (a.avg_gpa || 0));

  const anomaliesByType = await getAnomaliesByType({ advisorId });

  return {
    scope: 'advisor',
    advisor_id: advisorId,
    total_students: students.size,
    total_classes: byClass.size,
    avg_gpa: avgGpaOf(rows),
    at_risk_count: atRiskCount(rows),
    status_distribution: statusDistribution,
    grade_distribution: gradeDistribution,
    gpa_trend_by_semester: gpaTrendBySemester,
    classes_compare: classesCompare,
    failrate_by_course: failrateByCourse(byCourse),
    anomalies_by_type: anomaliesByType,
  };
}

/** Cấp TOÀN TRƯỜNG (T1–T4): trạng thái SV, xu hướng GPA theo kỳ, cảnh báo theo loại, so sánh khoá. */
export async function getSystemMetrics() {
  const { students, bySemester, byCohort, gradeDistribution } = await loadSummary();
  const rows = studentGpaRows(students);

  const statusDistribution = { ACTIVE: 0, AT_RISK: 0, NO_DATA: 0 };
  for (const r of rows) {
    if (!r.has_grades) statusDistribution.NO_DATA += 1;
    else if (Number(r.gpa || 0) < 2 || r.failed > 0 || r.absent > 0) statusDistribution.AT_RISK += 1;
    else statusDistribution.ACTIVE += 1;
  }

  const gpaTrendBySemester = [...bySemester.values()]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      semester: s.key,
      avg_gpa: s.credits > 0 ? round(s.weighted_gpa / s.credits) : null,
      fail_rate: failRatePercent(s),
    }));

  const cohortsCompare = [...byCohort.values()]
    .map((c) => ({
      cohort: c.key,
      total_students: c.student_ids.size,
      avg_gpa: c.credits > 0 ? round(c.weighted_gpa / c.credits) : null,
      fail_rate: failRatePercent(c),
    }))
    .sort((a, b) => String(a.cohort).localeCompare(String(b.cohort)));

  const [anomaliesByType, counts] = await Promise.all([
    getAnomaliesByType(),
    pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM admin_classes)::int AS total_classes,
        (SELECT COUNT(*) FROM users WHERE role = 'ADVISOR')::int AS total_advisors
      `
    ),
  ]);

  return {
    scope: 'system',
    total_students: students.size,
    total_classes: counts.rows[0]?.total_classes || 0,
    total_advisors: counts.rows[0]?.total_advisors || 0,
    avg_gpa: avgGpaOf(rows),
    at_risk_count: atRiskCount(rows),
    status_distribution: statusDistribution,
    grade_distribution: gradeDistribution,
    gpa_trend_by_semester: gpaTrendBySemester,
    anomalies_by_type: anomaliesByType,
    cohorts_compare: cohortsCompare,
  };
}
