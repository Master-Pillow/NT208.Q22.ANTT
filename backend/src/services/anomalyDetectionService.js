import { pool } from '../db.js';

const HIGH_RISK_COURSE_CODES = new Set([
  'IT002',
  'IT003',
  'IT004',
  'IT005',
  'MA001',
  'MA003',
  'MA006',
  'NT101',
]);

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const semesterRank = (semester) => {
  const text = String(semester || '');
  const match = text.match(/HK\s*(\d+)\D+(\d{4})/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[2]) * 10 + Number(match[1]);
};

export const ensureAiTables = async (client = pool) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_anomaly_runs (
      id BIGSERIAL PRIMARY KEY,
      run_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL'
        CHECK (run_type IN ('MANUAL', 'GRADE_UPDATE', 'SCHEDULED')),
      status VARCHAR(30) NOT NULL DEFAULT 'RUNNING'
        CHECK (status IN ('RUNNING', 'DONE', 'FAILED')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      summary_json JSONB,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS ai_student_anomalies (
      id BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      advisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      anomaly_type VARCHAR(60) NOT NULL,
      course_id BIGINT REFERENCES courses(id) ON DELETE SET NULL,
      evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      suggested_action TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_student_anomalies_student_status
      ON ai_student_anomalies(student_id, status);
    CREATE INDEX IF NOT EXISTS idx_ai_student_anomalies_advisor_created
      ON ai_student_anomalies(advisor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_student_anomalies_type_course
      ON ai_student_anomalies(anomaly_type, course_id);

    CREATE TABLE IF NOT EXISTS ai_anomaly_patterns (
      id BIGSERIAL PRIMARY KEY,
      source_course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      target_course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      support_count INT NOT NULL,
      confidence NUMERIC(6,4) NOT NULL,
      lift NUMERIC(6,4) NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source_course_id, target_course_id)
    );

    CREATE TABLE IF NOT EXISTS ai_briefs (
      id BIGSERIAL PRIMARY KEY,
      advisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      class_code VARCHAR(50) REFERENCES admin_classes(code) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
        CHECK (sent_status IN ('DRAFT', 'NOTIFIED', 'SENT', 'FAILED'))
    );

    CREATE INDEX IF NOT EXISTS idx_ai_briefs_advisor_class_created
      ON ai_briefs(advisor_id, class_code, created_at DESC);
  `);
};

export const assertAiAccess = (user) => {
  const role = normalizeRole(user?.role);
  if (!['ADMIN', 'ADVISOR'].includes(role)) {
    const error = new Error('Chỉ ADMIN hoặc ADVISOR mới được sử dụng tính năng AI học vụ.');
    error.status = 403;
    throw error;
  }
};

export const assertClassAccess = async ({ user, classCode, client = pool }) => {
  assertAiAccess(user);
  if (!classCode || normalizeRole(user.role) === 'ADMIN') return true;

  const result = await client.query(
    `
    SELECT 1
    FROM advisor_class
    WHERE advisor_id = $1 AND class_code = $2
    LIMIT 1
    `,
    [user.id, classCode]
  );

  if (result.rows.length === 0) {
    const error = new Error('Bạn không có quyền truy cập lớp này.');
    error.status = 403;
    throw error;
  }

  return true;
};

const buildScopeClause = (user, classCode, params) => {
  const conditions = [];
  const role = normalizeRole(user.role);

  if (role === 'ADVISOR') {
    params.push(user.id);
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM advisor_class scoped_ac
        WHERE scoped_ac.advisor_id = $${params.length}
          AND scoped_ac.class_code = s.class_code
      )
    `);
  }

  if (classCode) {
    params.push(classCode);
    conditions.push(`s.class_code = $${params.length}`);
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
};

const loadStudentSnapshots = async ({ client, user, classCode }) => {
  const params = [];
  const where = buildScopeClause(user, classCode, params);

  const result = await client.query(
    `
    SELECT
      s.id AS student_id,
      s.mssv,
      s.full_name,
      s.class_code,
      s.cohort,
      assigned.advisor_id,
      e.id AS enrollment_id,
      e.semester,
      c.id AS course_id,
      c.code AS course_code,
      c.name AS course_name,
      c.credits,
      g.letter_grade,
      g.numeric_grade,
      g.gpa_points
    FROM students s
    LEFT JOIN LATERAL (
      SELECT advisor_id
      FROM advisor_class ac
      WHERE ac.class_code = s.class_code
      ORDER BY advisor_id ASC
      LIMIT 1
    ) assigned ON true
    LEFT JOIN enrollments e ON e.student_id = s.id
    LEFT JOIN courses c ON c.id = e.course_id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    ${where}
    ORDER BY s.class_code ASC, s.full_name ASC, e.semester ASC, c.code ASC
    `,
    params
  );

  const students = new Map();

  for (const row of result.rows) {
    if (!students.has(row.student_id)) {
      students.set(row.student_id, {
        id: Number(row.student_id),
        mssv: row.mssv,
        fullName: row.full_name,
        classCode: row.class_code,
        cohort: row.cohort,
        advisorId: row.advisor_id ? Number(row.advisor_id) : null,
        courses: [],
        currentGpa: 0,
        failedCourses: [],
        accumulatedCredits: 0,
      });
    }

    if (!row.enrollment_id || !row.course_id) continue;

    students.get(row.student_id).courses.push({
      enrollmentId: Number(row.enrollment_id),
      semester: row.semester,
      courseId: Number(row.course_id),
      courseCode: row.course_code,
      courseName: row.course_name,
      credits: Number(row.credits || 0),
      letterGrade: row.letter_grade,
      numericGrade: row.numeric_grade === null ? null : Number(row.numeric_grade),
      gpaPoints: row.gpa_points === null ? null : Number(row.gpa_points),
    });
  }

  return [...students.values()].map((student) => {
    let attemptedCredits = 0;
    let weightedGpa = 0;

    for (const course of student.courses) {
      if (course.gpaPoints === null) continue;
      attemptedCredits += course.credits;
      weightedGpa += course.gpaPoints * course.credits;

      if (course.letterGrade !== 'F') {
        student.accumulatedCredits += course.credits;
      } else {
        student.failedCourses.push(course);
      }
    }

    student.currentGpa =
      attemptedCredits > 0 ? Number((weightedGpa / attemptedCredits).toFixed(2)) : 0;

    return student;
  });
};

const getClassCreditAverages = (students) => {
  const grouped = new Map();

  for (const student of students) {
    if (!grouped.has(student.classCode)) {
      grouped.set(student.classCode, { total: 0, count: 0 });
    }
    const entry = grouped.get(student.classCode);
    entry.total += student.accumulatedCredits;
    entry.count += 1;
  }

  const averages = new Map();
  for (const [classCode, entry] of grouped.entries()) {
    averages.set(classCode, entry.count > 0 ? entry.total / entry.count : 0);
  }
  return averages;
};

const buildSemesterDropAnomaly = (student) => {
  const semesters = new Map();

  for (const course of student.courses) {
    if (!course.semester || course.gpaPoints === null) continue;
    if (!semesters.has(course.semester)) {
      semesters.set(course.semester, { credits: 0, weighted: 0 });
    }
    const entry = semesters.get(course.semester);
    entry.credits += course.credits;
    entry.weighted += course.gpaPoints * course.credits;
  }

  const rows = [...semesters.entries()]
    .map(([semester, entry]) => ({
      semester,
      gpa: entry.credits > 0 ? Number((entry.weighted / entry.credits).toFixed(2)) : 0,
      rank: semesterRank(semester),
    }))
    .filter((row) => row.rank !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.rank - b.rank);

  if (rows.length < 2) return null;

  const previous = rows[rows.length - 2];
  const latest = rows[rows.length - 1];
  const drop = Number((previous.gpa - latest.gpa).toFixed(2));

  if (drop < 0.5) return null;

  return {
    student_id: student.id,
    advisor_id: student.advisorId,
    severity: drop >= 1 ? 'HIGH' : 'MEDIUM',
    title: 'GPA học kỳ giảm mạnh',
    description: `${student.fullName} có GPA giảm ${drop} điểm so với học kỳ trước.`,
    anomaly_type: 'GPA_DROP',
    course_id: null,
    evidence_json: {
      previous_semester: previous.semester,
      previous_gpa: previous.gpa,
      latest_semester: latest.semester,
      latest_gpa: latest.gpa,
      drop,
      threshold: 0.5,
    },
    suggested_action:
      'CVHT nên hẹn gặp sinh viên để tìm nguyên nhân và điều chỉnh kế hoạch học tập.',
  };
};

const detectStudentAnomalies = (student, classAverageCredits) => {
  const anomalies = [];
  const hasGrades = student.courses.some((course) => course.gpaPoints !== null);

  if (hasGrades && student.currentGpa < 2.0) {
    anomalies.push({
      student_id: student.id,
      advisor_id: student.advisorId,
      severity: student.failedCourses.length >= 2 ? 'HIGH' : 'MEDIUM',
      title: 'GPA dưới ngưỡng an toàn',
      description: `${student.fullName} có GPA tích lũy ${student.currentGpa}, thấp hơn ngưỡng 2.0.`,
      anomaly_type: 'LOW_GPA',
      course_id: null,
      evidence_json: {
        current_gpa: student.currentGpa,
        threshold: 2.0,
        failed_course_count: student.failedCourses.length,
      },
      suggested_action:
        'Ưu tiên tư vấn kế hoạch học lại, giảm tải môn học và theo dõi tiến độ trong 2 tuần.',
    });
  }

  if (student.failedCourses.length >= 2) {
    anomalies.push({
      student_id: student.id,
      advisor_id: student.advisorId,
      severity: 'HIGH',
      title: 'Có từ 2 môn F trở lên',
      description: `${student.fullName} đã rớt ${student.failedCourses.length} môn.`,
      anomaly_type: 'MULTIPLE_FAILURES',
      course_id: null,
      evidence_json: {
        failed_course_count: student.failedCourses.length,
        courses: student.failedCourses.map((course) => ({
          course_id: course.courseId,
          course_code: course.courseCode,
          course_name: course.courseName,
        })),
      },
      suggested_action:
        'CVHT nên lập danh sách môn cần học lại và khuyến nghị sinh viên đăng ký phụ đạo.',
    });
  }

  for (const course of student.courses) {
    if (course.numericGrade === null && course.letterGrade !== 'F') continue;
    const failed = course.letterGrade === 'F' || Number(course.numericGrade) < 4.0;
    if (!failed) continue;

    const isHighRiskCourse = HIGH_RISK_COURSE_CODES.has(course.courseCode);
    anomalies.push({
      student_id: student.id,
      advisor_id: student.advisorId,
      severity: isHighRiskCourse ? 'HIGH' : 'MEDIUM',
      title: `Nguy cơ rớt môn ${course.courseName}`,
      description: `${student.fullName} có điểm môn ${course.courseName} dưới ngưỡng đạt.`,
      anomaly_type: 'COURSE_FAILURE',
      course_id: course.courseId,
      evidence_json: {
        course_id: course.courseId,
        course_code: course.courseCode,
        course_name: course.courseName,
        numeric_grade: course.numericGrade,
        letter_grade: course.letterGrade,
        threshold: 4.0,
        high_risk_course: isHighRiskCourse,
      },
      suggested_action:
        'Liên hệ sinh viên và đề xuất kế hoạch học lại hoặc phụ đạo cho môn này.',
    });
  }

  const semesterDrop = buildSemesterDropAnomaly(student);
  if (semesterDrop) anomalies.push(semesterDrop);

  if (
    classAverageCredits >= 6 &&
    student.accumulatedCredits < Math.max(1, classAverageCredits * 0.75)
  ) {
    anomalies.push({
      student_id: student.id,
      advisor_id: student.advisorId,
      severity: student.currentGpa < 2.5 ? 'HIGH' : 'MEDIUM',
      title: 'Tín chỉ tích lũy thấp hơn mặt bằng lớp',
      description: `${student.fullName} có ${student.accumulatedCredits} tín chỉ tích lũy, thấp hơn trung bình lớp.`,
      anomaly_type: 'LOW_ACCUMULATED_CREDITS',
      course_id: null,
      evidence_json: {
        accumulated_credits: student.accumulatedCredits,
        class_average_credits: Number(classAverageCredits.toFixed(2)),
        threshold_ratio: 0.75,
      },
      suggested_action:
        'Kiểm tra tiến độ tích lũy tín chỉ và lập lộ trình đăng ký học phần phù hợp.',
    });
  }

  return anomalies;
};

const hasDuplicateOpenAnomaly = async (client, anomaly) => {
  const result = await client.query(
    `
    SELECT id
    FROM ai_student_anomalies
    WHERE student_id = $1
      AND anomaly_type = $2
      AND course_id IS NOT DISTINCT FROM $3
      AND status = 'OPEN'
      AND created_at >= NOW() - INTERVAL '7 days'
    LIMIT 1
    `,
    [anomaly.student_id, anomaly.anomaly_type, anomaly.course_id]
  );

  return result.rows.length > 0;
};

const insertAnomaly = async (client, anomaly) => {
  const result = await client.query(
    `
    INSERT INTO ai_student_anomalies (
      student_id,
      advisor_id,
      severity,
      title,
      description,
      anomaly_type,
      course_id,
      evidence_json,
      suggested_action
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
    RETURNING *
    `,
    [
      anomaly.student_id,
      anomaly.advisor_id,
      anomaly.severity,
      anomaly.title,
      anomaly.description,
      anomaly.anomaly_type,
      anomaly.course_id,
      JSON.stringify(anomaly.evidence_json || {}),
      anomaly.suggested_action,
    ]
  );

  if (anomaly.advisor_id) {
    await client.query(
      `
      INSERT INTO notifications (user_id, title, content, type)
      VALUES ($1, $2, $3, 'WARNING')
      `,
      [
        anomaly.advisor_id,
        anomaly.title,
        `${anomaly.description || ''} Gợi ý: ${anomaly.suggested_action || ''}`,
      ]
    );
  }

  return result.rows[0];
};

export const runAnomalyDetection = async ({
  runType = 'MANUAL',
  user,
  advisorId,
  classCode,
} = {}) => {
  assertAiAccess(user);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureAiTables(client);
    await assertClassAccess({ user, classCode, client });

    const runResult = await client.query(
      `
      INSERT INTO ai_anomaly_runs (run_type, status)
      VALUES ($1, 'RUNNING')
      RETURNING id
      `,
      [runType]
    );
    const runId = runResult.rows[0].id;

    const students = await loadStudentSnapshots({ client, user, classCode });
    const classAverages = getClassCreditAverages(students);
    const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    const typeCounts = {};
    let insertedCount = 0;
    let skippedDuplicateCount = 0;
    let candidateCount = 0;

    for (const student of students) {
      const targetAdvisorId =
        normalizeRole(user.role) === 'ADVISOR' ? user.id : advisorId || student.advisorId;
      student.advisorId = targetAdvisorId || student.advisorId;

      const anomalies = detectStudentAnomalies(
        student,
        classAverages.get(student.classCode) || 0
      );
      candidateCount += anomalies.length;

      for (const anomaly of anomalies) {
        if (await hasDuplicateOpenAnomaly(client, anomaly)) {
          skippedDuplicateCount += 1;
          continue;
        }

        await insertAnomaly(client, anomaly);
        insertedCount += 1;
        severityCounts[anomaly.severity] += 1;
        typeCounts[anomaly.anomaly_type] = (typeCounts[anomaly.anomaly_type] || 0) + 1;
      }
    }

    await detectFailurePatterns({ client });

    const summary = {
      runId,
      runType,
      classCode: classCode || null,
      scannedStudents: students.length,
      candidateAnomalies: candidateCount,
      insertedAnomalies: insertedCount,
      skippedDuplicateAnomalies: skippedDuplicateCount,
      severityCounts,
      typeCounts,
    };

    await client.query(
      `
      UPDATE ai_anomaly_runs
      SET status = 'DONE',
          finished_at = NOW(),
          summary_json = $2::jsonb
      WHERE id = $1
      `,
      [runId, JSON.stringify(summary)]
    );

    await client.query('COMMIT');
    return summary;
  } catch (err) {
    await client.query('ROLLBACK');

    try {
      await ensureAiTables(pool);
      await pool.query(
        `
        INSERT INTO ai_anomaly_runs (run_type, status, finished_at, error_message)
        VALUES ($1, 'FAILED', NOW(), $2)
        `,
        [runType, err.message]
      );
    } catch (logErr) {
      console.error('[ai/anomaly] Could not log failed run:', logErr.message);
    }

    throw err;
  } finally {
    client.release();
  }
};

export const detectFailurePatterns = async ({ client = pool } = {}) => {
  await ensureAiTables(client);

  const result = await client.query(`
    WITH failed AS (
      SELECT DISTINCT e.student_id, e.course_id
      FROM enrollments e
      JOIN grades g ON g.enrollment_id = e.id
      WHERE g.letter_grade = 'F' OR g.numeric_grade < 4.0
    ),
    course_fail_counts AS (
      SELECT course_id, COUNT(DISTINCT student_id)::numeric AS fail_count
      FROM failed
      GROUP BY course_id
    ),
    total_students AS (
      SELECT COUNT(DISTINCT student_id)::numeric AS total_count
      FROM enrollments
    ),
    pairs AS (
      SELECT
        a.course_id AS source_course_id,
        b.course_id AS target_course_id,
        COUNT(DISTINCT a.student_id)::int AS support_count
      FROM failed a
      JOIN failed b ON b.student_id = a.student_id AND b.course_id <> a.course_id
      GROUP BY a.course_id, b.course_id
    ),
    scored AS (
      SELECT
        p.source_course_id,
        p.target_course_id,
        p.support_count,
        ROUND((p.support_count::numeric / NULLIF(src.fail_count, 0)), 4) AS confidence,
        ROUND(
          (p.support_count::numeric / NULLIF(src.fail_count, 0))
          / NULLIF((tgt.fail_count / NULLIF(ts.total_count, 0)), 0),
          4
        ) AS lift
      FROM pairs p
      JOIN course_fail_counts src ON src.course_id = p.source_course_id
      JOIN course_fail_counts tgt ON tgt.course_id = p.target_course_id
      CROSS JOIN total_students ts
    )
    SELECT
      s.*,
      source.name AS source_course_name,
      target.name AS target_course_name
    FROM scored s
    JOIN courses source ON source.id = s.source_course_id
    JOIN courses target ON target.id = s.target_course_id
    WHERE s.support_count >= 3
      AND s.confidence >= 0.4
      AND s.lift >= 1.2
    ORDER BY s.lift DESC, s.confidence DESC
    LIMIT 50
  `);

  for (const row of result.rows) {
    const description = `Sinh viên rớt ${row.source_course_name} có nguy cơ cao rớt ${row.target_course_name}.`;
    await client.query(
      `
      INSERT INTO ai_anomaly_patterns (
        source_course_id,
        target_course_id,
        support_count,
        confidence,
        lift,
        description,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (source_course_id, target_course_id)
      DO UPDATE SET
        support_count = EXCLUDED.support_count,
        confidence = EXCLUDED.confidence,
        lift = EXCLUDED.lift,
        description = EXCLUDED.description,
        updated_at = NOW()
      `,
      [
        row.source_course_id,
        row.target_course_id,
        row.support_count,
        row.confidence,
        row.lift,
        description,
      ]
    );
  }

  return result.rows;
};

export const getAnomalies = async ({ user, filters = {} }) => {
  assertAiAccess(user);
  await ensureAiTables(pool);

  const params = [];
  const where = [];

  if (normalizeRole(user.role) === 'ADVISOR') {
    params.push(user.id);
    where.push(`
      EXISTS (
        SELECT 1
        FROM advisor_class ac
        WHERE ac.advisor_id = $${params.length}
          AND ac.class_code = s.class_code
      )
    `);
  }

  if (filters.classCode) {
    params.push(filters.classCode);
    where.push(`s.class_code = $${params.length}`);
  }
  if (filters.severity) {
    params.push(filters.severity);
    where.push(`a.severity = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`a.status = $${params.length}`);
  }
  if (filters.anomalyType) {
    params.push(filters.anomalyType);
    where.push(`a.anomaly_type = $${params.length}`);
  }

  const result = await pool.query(
    `
    SELECT
      a.*,
      s.full_name AS student_name,
      s.mssv,
      s.class_code,
      s.cohort,
      c.code AS course_code,
      c.name AS course_name,
      COALESCE(ROUND(
        SUM(g.gpa_points * co.credits::numeric)
          / NULLIF(SUM(co.credits), 0), 2
      ), 0) AS current_gpa
    FROM ai_student_anomalies a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN courses c ON c.id = a.course_id
    LEFT JOIN enrollments e ON e.student_id = s.id
    LEFT JOIN grades g ON g.enrollment_id = e.id
    LEFT JOIN courses co ON co.id = e.course_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY a.id, s.id, c.id
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 300
    `,
    params
  );

  return result.rows;
};

export const updateAnomalyStatus = async ({ user, anomalyId, status }) => {
  assertAiAccess(user);
  await ensureAiTables(pool);

  if (!['OPEN', 'RESOLVED', 'DISMISSED'].includes(status)) {
    const error = new Error('Trang thai khong hop le.');
    error.status = 400;
    throw error;
  }

  const params = [anomalyId, status];
  const advisorGuard =
    normalizeRole(user.role) === 'ADVISOR'
      ? `
        AND EXISTS (
          SELECT 1
          FROM students s
          JOIN advisor_class ac ON ac.class_code = s.class_code
          WHERE s.id = a.student_id
            AND ac.advisor_id = $3
        )
      `
      : '';

  if (normalizeRole(user.role) === 'ADVISOR') params.push(user.id);

  const result = await pool.query(
    `
    UPDATE ai_student_anomalies a
    SET status = $2,
        updated_at = NOW()
    WHERE a.id = $1
    ${advisorGuard}
    RETURNING *
    `,
    params
  );

  if (result.rows.length === 0) {
    const error = new Error('Không tìm thấy cảnh báo hoặc bạn không có quyền cập nhật.');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

export const getFailurePatterns = async ({ user }) => {
  assertAiAccess(user);
  await ensureAiTables(pool);

  const result = await pool.query(`
    SELECT
      p.*,
      source.code AS source_course_code,
      source.name AS source_course_name,
      target.code AS target_course_code,
      target.name AS target_course_name
    FROM ai_anomaly_patterns p
    JOIN courses source ON source.id = p.source_course_id
    JOIN courses target ON target.id = p.target_course_id
    ORDER BY p.lift DESC, p.confidence DESC
    LIMIT 100
  `);

  return result.rows;
};
