import { pool } from '../db.js';
import {
  assertAiAccess,
  assertClassAccess,
  ensureAiTables,
} from './anomalyDetectionService.js';

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const topItems = (rows, key, limit = 3) => {
  const counts = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
};

export const computeBriefStats = async ({ user, classCode }) => {
  assertAiAccess(user);
  if (!classCode) {
    const error = new Error('Cần chọn mã lớp để sinh AI Brief.');
    error.status = 400;
    throw error;
  }

  await ensureAiTables(pool);
  await assertClassAccess({ user, classCode });

  const [studentsRes, anomaliesRes, advisorRes] = await Promise.all([
    pool.query(
      `
      SELECT COUNT(*)::int AS total_students
      FROM students
      WHERE class_code = $1
      `,
      [classCode]
    ),
    pool.query(
      `
      SELECT
        a.*,
        c.name AS course_name
      FROM ai_student_anomalies a
      JOIN students s ON s.id = a.student_id
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE s.class_code = $1
        AND a.status = 'OPEN'
      ORDER BY a.created_at DESC
      `,
      [classCode]
    ),
    pool.query(
      `
      SELECT advisor_id
      FROM advisor_class
      WHERE class_code = $1
      ORDER BY advisor_id ASC
      LIMIT 1
      `,
      [classCode]
    ),
  ]);

  const anomalies = anomaliesRes.rows;
  const highRiskStudents = new Set(
    anomalies
      .filter((row) => row.severity === 'HIGH')
      .map((row) => Number(row.student_id))
  );
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newAnomalyCount = anomalies.filter(
    (row) => new Date(row.created_at).getTime() >= oneWeekAgo
  ).length;

  const typeLabel = {
    LOW_GPA: 'GPA dưới 2.0',
    MULTIPLE_FAILURES: 'Có từ 2 môn F trở lên',
    COURSE_FAILURE: 'Điểm môn học dưới 4.0',
    GPA_DROP: 'GPA học kỳ giảm mạnh',
    LOW_ACCUMULATED_CREDITS: 'Chậm tiến độ tích lũy tín chỉ',
  };

  const topReasons = topItems(anomalies, 'anomaly_type', 4).map(
    (type) => typeLabel[type] || type
  );

  const recommendedActions = [
    'Liên hệ sinh viên rủi ro cao trong tuần này',
    'Lập kế hoạch học lại/phụ đạo cho các môn có nhiều cảnh báo',
    'Theo dõi GPA và tín chỉ tích lũy trong 2 tuần tiếp theo',
  ];

  return {
    classCode,
    totalStudents: studentsRes.rows[0]?.total_students || 0,
    highRiskCount: highRiskStudents.size,
    newAnomalyCount,
    openAnomalyCount: anomalies.length,
    topRiskCourses: topItems(anomalies, 'course_name', 3),
    topReasons,
    recommendedActions,
    advisorId:
      normalizeRole(user.role) === 'ADVISOR'
        ? user.id
        : advisorRes.rows[0]?.advisor_id || null,
  };
};

const deterministicBrief = (stats) => {
  const courses =
    stats.topRiskCourses.length > 0 ? stats.topRiskCourses.join(', ') : 'chưa có môn nổi bật';
  const reasons =
    stats.topReasons.length > 0 ? stats.topReasons.join('; ') : 'chưa có nhóm lý do nổi bật';

  return [
    `Lớp ${stats.classCode} hiện có ${stats.totalStudents} sinh viên, ${stats.newAnomalyCount} cảnh báo mới trong 7 ngày gần đây và ${stats.highRiskCount} sinh viên thuộc nhóm rủi ro cao.`,
    '',
    `Rủi ro chính: ${reasons}. Môn cần chú ý: ${courses}.`,
    '',
    'Khuyến nghị:',
    ...stats.recommendedActions.map((action) => `- ${action}`),
  ].join('\n');
};

const callGemini = async (stats) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof fetch !== 'function') return null;

  const prompt = `
Bạn là trợ lý học vụ. Hãy viết AI Brief bằng tiếng Việt, ngắn gọn, dựa trên JSON thống kê đã tính sẵn.
Quy tắc:
- Không được bịa số liệu.
- Không nhắc đến sinh viên cụ thể nếu input không có tên.
- Gồm 1 đoạn tóm tắt, danh sách rủi ro chính, và danh sách hành động đề xuất.

Thống kê:
${JSON.stringify(stats, null, 2)}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
    }
  );

  if (!response.ok) {
    console.warn('[ai/brief] Gemini request failed:', response.status);
    return null;
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
};

export const generateAiBrief = async ({ user, classCode }) => {
  const stats = await computeBriefStats({ user, classCode });
  const content = (await callGemini(stats)) || deterministicBrief(stats);
  const title = `AI Brief lớp ${stats.classCode}`;

  const result = await pool.query(
    `
    INSERT INTO ai_briefs (
      advisor_id,
      class_code,
      title,
      content,
      stats_json,
      sent_status
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    RETURNING *
    `,
    [
      stats.advisorId,
      stats.classCode,
      title,
      content,
      JSON.stringify(stats),
      stats.advisorId ? 'NOTIFIED' : 'DRAFT',
    ]
  );

  if (stats.advisorId) {
    await pool.query(
      `
      INSERT INTO notifications (user_id, title, content, type)
      VALUES ($1, $2, $3, 'INFO')
      `,
      [
        stats.advisorId,
        title,
        `Đã sinh bản tin AI Brief cho lớp ${stats.classCode}.`,
      ]
    );
  }

  return {
    brief: result.rows[0],
    stats,
  };
};
