import { pool } from '../db.js';
import { assertAiAccess, assertClassAccess } from './anomalyDetectionService.js';

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const fixMojibake = (value) => {
  if (!value || !/[ÂÃÄáº»]/.test(value)) return value || '';
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value || '';
  }
};

const normalizeText = (value) =>
  fixMojibake(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractClassCode = (question) => {
  const match = question.match(/\b[A-Z]{2,5}\d{4}[A-Z0-9.]*/i);
  return match ? match[0].toUpperCase() : null;
};

const extractCohort = (question) => {
  const normalized = normalizeText(question);
  const match = normalized.match(/\b(20\d{2})\b/);
  return match ? match[1] : null;
};

const extractLimit = (question, fallback = 20) => {
  const normalized = normalizeText(question);
  const match = normalized.match(/\b(\d{1,2})\s*(sinh vien|sv|ban)\b/);
  if (!match) return fallback;
  return Math.min(Math.max(Number(match[1]), 1), 100);
};

const loadCourses = async () => {
  const result = await pool.query(`
    SELECT id, code, name
    FROM courses
    ORDER BY LENGTH(name) DESC
  `);
  return result.rows;
};

const findCourse = async (question) => {
  const courses = await loadCourses();
  const normalizedQuestion = normalizeText(question);

  return (
    courses.find((course) => normalizedQuestion.includes(normalizeText(course.code))) ||
    courses.find((course) => normalizedQuestion.includes(normalizeText(course.name))) ||
    null
  );
};

const inferIntent = (question) => {
  const normalized = normalizeText(question);

  if (
    normalized.includes('bieu do') ||
    normalized.includes('pho diem') ||
    normalized.includes('phan bo diem') ||
    normalized.includes('distribution')
  ) {
    return 'grade_distribution_chart';
  }

  if (
    normalized.includes('gpa cao') ||
    normalized.includes('cao nhat') ||
    normalized.includes('top') ||
    normalized.includes('gioi nhat')
  ) {
    return 'top_students';
  }

  if (
    normalized.includes('tom tat') ||
    normalized.includes('tinh hinh') ||
    normalized.includes('bao cao lop')
  ) {
    return 'class_summary';
  }

  return 'student_filter';
};

const buildScopeWhere = ({ user, classCode, alias = 's', params }) => {
  const where = [];
  const role = normalizeRole(user.role);

  if (role === 'ADVISOR') {
    params.push(user.id);
    where.push(`
      EXISTS (
        SELECT 1
        FROM advisor_class scoped_ac
        WHERE scoped_ac.advisor_id = $${params.length}
          AND scoped_ac.class_code = ${alias}.class_code
      )
    `);
  }

  if (classCode) {
    params.push(classCode);
    where.push(`${alias}.class_code = $${params.length}`);
  }

  return where;
};

const buildStudentSummaryCte = () => `
  WITH student_summary AS (
    SELECT
      s.id,
      s.mssv,
      s.full_name,
      s.class_code,
      s.cohort,
      COALESCE(
        ROUND(SUM(g.gpa_points * c.credits::numeric) / NULLIF(SUM(c.credits), 0), 2),
        0
      ) AS current_gpa,
      COUNT(*) FILTER (WHERE g.letter_grade = 'F' OR g.numeric_grade < 4.0)::int AS failed_subjects,
      COALESCE(SUM(c.credits) FILTER (WHERE g.letter_grade <> 'F'), 0)::int AS accumulated_credits
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    LEFT JOIN courses c ON c.id = e.course_id
    GROUP BY s.id
  )
`;

const runStudentFilter = async ({ user, plan, course, limit }) => {
  const params = [];
  const scope = buildScopeWhere({ user, classCode: plan.filters.class_code, alias: 'ss', params });
  const where = [...scope];

  if (course) {
    params.push(course.id);
    where.push(`
      EXISTS (
        SELECT 1
        FROM enrollments e
        JOIN grades g ON g.enrollment_id = e.id
        WHERE e.student_id = ss.id
          AND e.course_id = $${params.length}
          AND (g.letter_grade = 'F' OR g.numeric_grade < 4.0)
      )
    `);
  } else {
    where.push(`(ss.current_gpa < 2.0 OR ss.failed_subjects > 0)`);
  }

  params.push(limit);

  const result = await pool.query(
    `
    ${buildStudentSummaryCte()}
    SELECT
      ss.id,
      ss.mssv,
      ss.full_name,
      ss.class_code,
      ss.cohort,
      ss.current_gpa,
      ss.failed_subjects,
      ss.accumulated_credits
    FROM student_summary ss
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ss.failed_subjects DESC, ss.current_gpa ASC, ss.full_name ASC
    LIMIT $${params.length}
    `,
    params
  );

  return {
    output: 'table',
    columns: [
      { key: 'full_name', label: 'Ho ten' },
      { key: 'mssv', label: 'MSSV' },
      { key: 'class_code', label: 'Lop' },
      { key: 'current_gpa', label: 'GPA' },
      { key: 'failed_subjects', label: 'Mon rot' },
      { key: 'accumulated_credits', label: 'Tin chi dat' },
    ],
    rows: result.rows,
    summary:
      result.rows.length > 0
        ? `Tim thay ${result.rows.length} sinh vien phu hop voi dieu kien rui ro.`
        : 'Khong tim thay sinh vien phu hop voi dieu kien.',
  };
};

const runTopStudents = async ({ user, plan, limit }) => {
  const params = [];
  const scope = buildScopeWhere({ user, classCode: plan.filters.class_code, alias: 'ss', params });
  const where = [...scope];

  if (plan.filters.cohort) {
    params.push(plan.filters.cohort);
    where.push(`ss.cohort = $${params.length}`);
  }

  params.push(limit);

  const result = await pool.query(
    `
    ${buildStudentSummaryCte()}
    SELECT
      ss.id,
      ss.mssv,
      ss.full_name,
      ss.class_code,
      ss.cohort,
      ss.current_gpa,
      ss.failed_subjects,
      ss.accumulated_credits
    FROM student_summary ss
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ss.current_gpa DESC, ss.accumulated_credits DESC, ss.full_name ASC
    LIMIT $${params.length}
    `,
    params
  );

  return {
    output: 'table',
    columns: [
      { key: 'full_name', label: 'Ho ten' },
      { key: 'mssv', label: 'MSSV' },
      { key: 'class_code', label: 'Lop' },
      { key: 'cohort', label: 'Khoa' },
      { key: 'current_gpa', label: 'GPA' },
      { key: 'accumulated_credits', label: 'Tin chi dat' },
    ],
    rows: result.rows,
    summary:
      'Danh sach sap xep theo GPA va tin chi tich luy. He thong hien chua co cot diem tieng Anh nen khong loc theo tieu chi tieng Anh.',
  };
};

const runGradeDistribution = async ({ user, plan, course }) => {
  if (!course) {
    const error = new Error('Can xac dinh mon hoc de ve pho diem.');
    error.status = 400;
    throw error;
  }

  const params = [course.id];
  const where = [`e.course_id = $1`];
  const scope = buildScopeWhere({ user, classCode: plan.filters.class_code, alias: 's', params });
  where.push(...scope);

  if (plan.filters.cohort) {
    params.push(plan.filters.cohort);
    where.push(`s.cohort = $${params.length}`);
  }

  const result = await pool.query(
    `
    SELECT
      COALESCE(g.letter_grade, 'N/A') AS label,
      COUNT(*)::int AS value
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    WHERE ${where.join(' AND ')}
    GROUP BY COALESCE(g.letter_grade, 'N/A')
    ORDER BY label ASC
    `,
    params
  );

  return {
    output: 'chart',
    chart: {
      type: 'bar',
      title: `Pho diem mon ${fixMojibake(course.name)}`,
      data: result.rows,
    },
    rows: result.rows,
    summary: `Pho diem mon ${fixMojibake(course.name)} gom ${result.rows.reduce(
      (sum, row) => sum + Number(row.value || 0),
      0
    )} luot hoc.`,
  };
};

const runClassSummary = async ({ user, plan }) => {
  if (!plan.filters.class_code) {
    const error = new Error('Can co ma lop de tom tat tinh hinh lop.');
    error.status = 400;
    throw error;
  }

  const params = [];
  const scope = buildScopeWhere({ user, classCode: plan.filters.class_code, alias: 'ss', params });

  const result = await pool.query(
    `
    ${buildStudentSummaryCte()}
    SELECT
      COUNT(*)::int AS total_students,
      ROUND(AVG(ss.current_gpa)::numeric, 2) AS avg_gpa,
      COUNT(*) FILTER (WHERE ss.current_gpa < 2.0 OR ss.failed_subjects >= 2)::int AS high_risk_students,
      COUNT(*) FILTER (WHERE ss.failed_subjects > 0)::int AS students_with_failures,
      ROUND(AVG(ss.accumulated_credits)::numeric, 2) AS avg_accumulated_credits
    FROM student_summary ss
    ${scope.length ? `WHERE ${scope.join(' AND ')}` : ''}
    `,
    params
  );

  return {
    output: 'summary',
    rows: [result.rows[0]],
    summary: `Lop ${plan.filters.class_code} co ${result.rows[0].total_students} sinh vien, GPA trung binh ${result.rows[0].avg_gpa || 0}, ${result.rows[0].high_risk_students} sinh vien rui ro cao.`,
  };
};

export const executeAiQuery = async ({ user, question }) => {
  assertAiAccess(user);

  if (!question || !question.trim()) {
    const error = new Error('Vui long nhap cau hoi.');
    error.status = 400;
    throw error;
  }

  const intent = inferIntent(question);
  const classCode = extractClassCode(question);
  const cohort = extractCohort(question);
  const course = await findCourse(question);
  const limit = extractLimit(question, intent === 'top_students' ? 5 : 20);

  await assertClassAccess({ user, classCode });

  const plan = {
    intent,
    output: intent === 'grade_distribution_chart' ? 'chart' : 'table',
    filters: {
      class_code: classCode,
      cohort,
      course_id: course?.id || null,
      course_code: course?.code || null,
      course_name: course ? fixMojibake(course.name) : null,
      risk: intent === 'student_filter' ? 'fail_or_low_gpa' : null,
    },
    limit,
  };

  let payload;
  if (intent === 'grade_distribution_chart') {
    payload = await runGradeDistribution({ user, plan, course });
  } else if (intent === 'top_students') {
    payload = await runTopStudents({ user, plan, limit });
  } else if (intent === 'class_summary') {
    payload = await runClassSummary({ user, plan });
  } else {
    payload = await runStudentFilter({ user, plan, course, limit });
  }

  return {
    question,
    plan,
    ...payload,
  };
};
