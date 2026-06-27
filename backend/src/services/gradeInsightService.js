import crypto from 'node:crypto';
import { pool } from '../db.js';
import { getClassMetrics, advisorCanAccessClass } from './classMetricsService.js';
import { getStudentMetricsById } from './studentMetricsService.js';
import { getCohortMetrics, getSystemMetrics, getAdvisorMetrics } from './cohortSystemMetricsService.js';

const VALID_SCOPES = new Set(['student', 'class', 'cohort', 'system', 'advisor']);
const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// ─── Schema cache ────────────────────────────────────────────────────────────
export async function ensureGradeInsightSchema(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_grade_insights (
      id BIGSERIAL PRIMARY KEY,
      scope VARCHAR(20) NOT NULL,
      ref_id VARCHAR(120) NOT NULL,
      metrics_hash VARCHAR(64) NOT NULL,
      source VARCHAR(20) NOT NULL DEFAULT 'gemini',
      headline TEXT,
      trend VARCHAR(40),
      summary_md TEXT,
      highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
      risks JSONB NOT NULL DEFAULT '[]'::jsonb,
      commendations JSONB NOT NULL DEFAULT '[]'::jsonb,
      actions JSONB NOT NULL DEFAULT '[]'::jsonb,
      stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (scope, ref_id, metrics_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_ai_grade_insights_scope_ref
      ON ai_grade_insights(scope, ref_id, generated_at DESC);
  `);
}

// ─── Phân quyền theo scope ───────────────────────────────────────────────────
async function resolveScopeAndAccess({ user, scope, id }) {
  const role = normalizeRole(user?.role);

  if (scope === 'system') {
    if (role !== 'ADMIN') throw httpError('Chỉ ADMIN mới xem phân tích toàn trường.', 403);
    return { refId: 'system' };
  }

  if (scope === 'cohort') {
    if (role !== 'ADMIN') throw httpError('Chỉ ADMIN mới xem phân tích cấp khoá.', 403);
    if (!id) throw httpError('Thiếu mã khoá (cohort).');
    return { refId: String(id) };
  }

  if (scope === 'advisor') {
    const targetId = id || user.id;
    if (role === 'ADMIN') return { refId: String(targetId) };
    if (role === 'ADVISOR') {
      if (Number(user.id) !== Number(targetId)) {
        throw httpError('Bạn chỉ được xem phân tích tổng hợp của chính mình.', 403);
      }
      return { refId: String(targetId) };
    }
    throw httpError('Bạn không có quyền xem phân tích cố vấn.', 403);
  }

  if (scope === 'class') {
    if (!id) throw httpError('Thiếu mã lớp.');
    if (role === 'ADMIN') return { refId: String(id) };
    if (role === 'ADVISOR') {
      const ok = await advisorCanAccessClass(user.id, id);
      if (!ok) throw httpError('Bạn không phụ trách lớp này.', 403);
      return { refId: String(id) };
    }
    throw httpError('Bạn không có quyền xem phân tích lớp.', 403);
  }

  // scope === 'student' — id là khoá chính students.id
  if (!id) throw httpError('Thiếu mã sinh viên.');
  const studentRes = await pool.query(
    `SELECT id, mssv, full_name, class_code FROM students WHERE id = $1 LIMIT 1`,
    [id]
  );
  const student = studentRes.rows[0];
  if (!student) throw httpError('Không tìm thấy sinh viên.', 404);

  if (role === 'ADMIN') return { refId: String(student.id), student };
  if (role === 'STUDENT') {
    if (Number(user.student_id) !== Number(student.id)) {
      throw httpError('Bạn chỉ được xem phân tích của chính mình.', 403);
    }
    return { refId: String(student.id), student };
  }
  if (role === 'ADVISOR') {
    const ok = student.class_code
      ? await advisorCanAccessClass(user.id, student.class_code)
      : false;
    if (!ok) throw httpError('Bạn không phụ trách sinh viên này.', 403);
    return { refId: String(student.id), student };
  }
  throw httpError('Bạn không có quyền xem phân tích này.', 403);
}

// ─── Tính metrics + rút gọn để đưa vào prompt / hash ─────────────────────────
async function computeCompactStats({ scope, id, student }) {
  if (scope === 'student') {
    const m = await getStudentMetricsById(id);
    return {
      scope,
      student: m.student
        ? { mssv: m.student.mssv, full_name: m.student.full_name, class_code: m.student.class_code }
        : (student || null),
      cumulative_gpa: m.cumulative_gpa,
      semesters: m.by_semester.map((s) => ({
        semester: s.semester,
        gpa: s.gpa,
        delta: s.gpa_delta,
        drop: s.gpa_drop,
        failed: s.failed,
        absent: s.absent,
      })),
      dropped_semesters: m.dropped_semesters,
      grade_distribution: m.grade_distribution,
      improving: m.improving,
      commendations: m.commendations.map((c) => ({ semester: c.semester, label: c.label })),
    };
  }

  if (scope === 'class') {
    const m = await getClassMetrics(id);
    return {
      scope,
      class_code: id,
      class_name: m.class_info?.name || null,
      total_students: m.total_students,
      avg_gpa: m.avg_gpa,
      fail_rate: m.fail_rate,
      at_risk_count: m.at_risk_count,
      gpa_by_semester: m.gpa_by_semester.map((s) => ({ semester: s.semester, avg_gpa: s.avg_gpa, fail_rate: s.fail_rate })),
      failrate_by_course: m.failrate_by_course.slice(0, 5).map((c) => ({ name: c.name, fail_rate: c.fail_rate })),
      top_improving: m.top_improving.slice(0, 3).map((s) => ({ name: s.full_name, gpa_delta: s.gpa_delta })),
      top_declining: m.top_declining.slice(0, 3).map((s) => ({ name: s.full_name, gpa_delta: s.gpa_delta })),
      grade_distribution: m.grade_distribution,
    };
  }

  if (scope === 'cohort') {
    const m = await getCohortMetrics(id);
    return {
      scope,
      cohort: id,
      total_students: m.total_students,
      total_classes: m.total_classes,
      avg_gpa: m.avg_gpa,
      at_risk_count: m.at_risk_count,
      gpa_by_year: m.gpa_by_year,
      failrate_by_year: m.failrate_by_year,
      classes_compare: m.classes_compare.slice(0, 8),
      grade_distribution: m.grade_distribution,
    };
  }

  if (scope === 'advisor') {
    const m = await getAdvisorMetrics(id);
    return {
      scope,
      total_students: m.total_students,
      total_classes: m.total_classes,
      avg_gpa: m.avg_gpa,
      at_risk_count: m.at_risk_count,
      status_distribution: m.status_distribution,
      gpa_trend_by_semester: m.gpa_trend_by_semester,
      classes_compare: m.classes_compare,
      failrate_by_course: m.failrate_by_course.slice(0, 5).map((c) => ({ name: c.name, fail_rate: c.fail_rate })),
      grade_distribution: m.grade_distribution,
      anomalies_by_type: m.anomalies_by_type,
    };
  }

  // system
  const m = await getSystemMetrics();
  return {
    scope,
    total_students: m.total_students,
    total_classes: m.total_classes,
    total_advisors: m.total_advisors,
    avg_gpa: m.avg_gpa,
    at_risk_count: m.at_risk_count,
    status_distribution: m.status_distribution,
    gpa_trend_by_semester: m.gpa_trend_by_semester,
    anomalies_by_type: m.anomalies_by_type,
    cohorts_compare: m.cohorts_compare,
  };
}

function hashStats(stats) {
  return crypto.createHash('sha256').update(JSON.stringify(stats)).digest('hex');
}

// ─── Phân tích bằng luật (fallback khi không có Gemini) ──────────────────────
function detectTrend(series) {
  const values = series.filter((v) => v !== null && v !== undefined);
  if (values.length < 2) return 'stable';
  const delta = Number(values[values.length - 1]) - Number(values[0]);
  if (delta >= 0.2) return 'up';
  if (delta <= -0.2) return 'down';
  return 'stable';
}

const TREND_LABEL = { up: 'đi lên', down: 'đi xuống', stable: 'ổn định' };

function ruleBasedInsight(stats) {
  const highlights = [];
  const risks = [];
  const commendations = [];
  const actions = [];
  let headline = '';
  let trend = 'stable';

  if (stats.scope === 'student') {
    const name = stats.student?.full_name || 'Sinh viên';
    trend = detectTrend(stats.semesters.map((s) => s.gpa));
    headline = `${name}: GPA tích lũy ${stats.cumulative_gpa ?? '—'} (xu hướng ${TREND_LABEL[trend]}).`;
    const f = stats.grade_distribution?.F || 0;
    if (stats.cumulative_gpa !== null && stats.cumulative_gpa < 2) risks.push(`GPA tích lũy ${stats.cumulative_gpa} dưới ngưỡng an toàn 2.0.`);
    if (f > 0) risks.push(`Có ${f} môn điểm F cần học lại.`);
    if (stats.dropped_semesters?.length) risks.push(`GPA tụt mạnh ở kỳ: ${stats.dropped_semesters.join(', ')}.`);
    for (const c of stats.commendations || []) commendations.push(`${c.label} ở ${c.semester}.`);
    if (stats.improving) highlights.push('Có học kỳ tiến bộ rõ rệt so với trước.');
    actions.push(risks.length ? 'Hẹn gặp cố vấn để lập kế hoạch cải thiện điểm.' : 'Duy trì phong độ và đăng ký học phần hợp lý.');
  } else if (stats.scope === 'class') {
    trend = detectTrend(stats.gpa_by_semester.map((s) => s.avg_gpa));
    headline = `Lớp ${stats.class_code}: GPA TB ${stats.avg_gpa ?? '—'}, tỷ lệ rớt/vắng ${stats.fail_rate ?? 0}% (xu hướng ${TREND_LABEL[trend]}).`;
    if (stats.at_risk_count > 0) risks.push(`${stats.at_risk_count}/${stats.total_students} sinh viên thuộc nhóm rủi ro.`);
    const hardest = stats.failrate_by_course?.[0];
    if (hardest && hardest.fail_rate > 0) risks.push(`Môn khó nhất: ${hardest.name} (tỷ lệ rớt ${hardest.fail_rate}%).`);
    for (const s of stats.top_improving || []) commendations.push(`${s.name} tiến bộ +${s.gpa_delta} GPA.`);
    if (stats.top_declining?.[0]) highlights.push(`Cần lưu ý ${stats.top_declining[0].name} (GPA ${stats.top_declining[0].gpa_delta}).`);
    actions.push('Mở nhóm phụ đạo cho môn có tỷ lệ rớt cao.');
    actions.push('Ưu tiên tư vấn nhóm sinh viên rủi ro trong tuần.');
  } else if (stats.scope === 'cohort') {
    trend = detectTrend(stats.gpa_by_year.map((y) => y.avg_gpa));
    headline = `Khoá ${stats.cohort}: GPA TB ${stats.avg_gpa ?? '—'} qua ${stats.total_students} sinh viên (xu hướng ${TREND_LABEL[trend]}).`;
    const sorted = [...(stats.classes_compare || [])].filter((c) => c.avg_gpa !== null);
    if (sorted.length) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      highlights.push(`Lớp dẫn đầu: ${best.class_code} (GPA ${best.avg_gpa}).`);
      if (worst.class_code !== best.class_code) risks.push(`Lớp cần hỗ trợ: ${worst.class_code} (GPA ${worst.avg_gpa}, rớt ${worst.fail_rate}%).`);
    }
    if (stats.at_risk_count > 0) risks.push(`${stats.at_risk_count} sinh viên toàn khoá thuộc nhóm rủi ro.`);
    actions.push('Phân bổ nguồn lực phụ đạo theo lớp yếu nhất.');
  } else if (stats.scope === 'advisor') {
    trend = detectTrend(stats.gpa_trend_by_semester.map((s) => s.avg_gpa));
    headline = `Lớp phụ trách: ${stats.total_students} sinh viên / ${stats.total_classes} lớp, GPA TB ${stats.avg_gpa ?? '—'} (xu hướng ${TREND_LABEL[trend]}).`;
    if (stats.at_risk_count > 0) risks.push(`${stats.at_risk_count}/${stats.total_students} sinh viên thuộc nhóm rủi ro.`);
    const hardest = stats.failrate_by_course?.[0];
    if (hardest && hardest.fail_rate > 0) risks.push(`Môn khó nhất: ${hardest.name} (tỷ lệ rớt ${hardest.fail_rate}%).`);
    const cc = [...(stats.classes_compare || [])].filter((c) => c.avg_gpa !== null);
    if (cc.length) {
      const best = cc[0];
      const worst = cc[cc.length - 1];
      highlights.push(`Lớp tốt nhất: ${best.class_code} (GPA ${best.avg_gpa}).`);
      if (worst.class_code !== best.class_code) risks.push(`Lớp cần hỗ trợ: ${worst.class_code} (GPA ${worst.avg_gpa}, rớt ${worst.fail_rate}%).`);
    }
    const topAnomaly = stats.anomalies_by_type?.[0];
    if (topAnomaly) highlights.push(`Cảnh báo phổ biến: ${topAnomaly.label} (${topAnomaly.count}).`);
    actions.push('Ưu tiên gặp nhóm sinh viên rủi ro và mở phụ đạo môn khó.');
  } else {
    trend = detectTrend(stats.gpa_trend_by_semester.map((s) => s.avg_gpa));
    headline = `Toàn trường: ${stats.total_students} sinh viên, GPA TB ${stats.avg_gpa ?? '—'} (xu hướng ${TREND_LABEL[trend]}).`;
    const at = stats.status_distribution?.AT_RISK || 0;
    if (at > 0) risks.push(`${at} sinh viên đang ở trạng thái rủi ro.`);
    const topAnomaly = stats.anomalies_by_type?.[0];
    if (topAnomaly) highlights.push(`Loại cảnh báo phổ biến nhất: ${topAnomaly.label} (${topAnomaly.count}).`);
    const cohorts = [...(stats.cohorts_compare || [])].filter((c) => c.avg_gpa !== null);
    if (cohorts.length) {
      const worst = cohorts.reduce((a, b) => (Number(a.avg_gpa) <= Number(b.avg_gpa) ? a : b));
      risks.push(`Khoá cần chú ý: ${worst.cohort} (GPA ${worst.avg_gpa}).`);
    }
    actions.push('Rà soát các khoá/lớp có GPA thấp và tỷ lệ rớt cao.');
  }

  const summary_md = [
    `**${headline}**`,
    '',
    risks.length ? `**Rủi ro:**\n${risks.map((r) => `- ${r}`).join('\n')}` : '',
    commendations.length ? `**Tuyên dương:**\n${commendations.map((c) => `- ${c}`).join('\n')}` : '',
    actions.length ? `**Đề xuất:**\n${actions.map((a) => `- ${a}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  return { headline, trend, summary_md, highlights, risks, commendations, actions };
}

// ─── Gọi Gemini sinh nhận định (JSON) ────────────────────────────────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGemini(stats) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || typeof fetch !== 'function') return null;

  const scopeLabel = {
    student: 'một sinh viên',
    class: 'một lớp học',
    cohort: 'một khoá tuyển sinh',
    system: 'toàn trường',
    advisor: 'các lớp một cố vấn phụ trách',
  }[stats.scope];

  const prompt = `Bạn là trợ lý phân tích học vụ của trường UIT. Dưới đây là JSON SỐ LIỆU ĐÃ TÍNH SẴN cho ${scopeLabel}.
Hãy viết nhận định bằng TIẾNG VIỆT CÓ DẤU, súc tích, KHÔNG bịa thêm số liệu ngoài JSON.
Chỉ trả về một object JSON đúng cấu trúc sau (không kèm giải thích, không markdown ngoài JSON):
{
  "headline": "1 câu tóm tắt nổi bật",
  "trend": "up | down | stable",
  "summary_md": "đoạn phân tích ngắn dạng markdown",
  "highlights": ["điểm sáng 1", "..."],
  "risks": ["rủi ro 1", "..."],
  "commendations": ["tuyên dương 1", "..."],
  "actions": ["đề xuất hành động 1", "..."]
}

SỐ LIỆU:
${JSON.stringify(stats, null, 2)}`;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.status === 429) continue;
      if (!response.ok) {
        console.warn(`[ai/grade-insight] ${model} failed (${response.status})`);
        continue;
      }

      const data = await response.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text)
        .filter(Boolean)
        .join('')
        .trim();
      const parsed = extractJson(text);
      if (parsed && parsed.headline) {
        return {
          headline: String(parsed.headline || ''),
          trend: ['up', 'down', 'stable'].includes(parsed.trend) ? parsed.trend : 'stable',
          summary_md: String(parsed.summary_md || ''),
          highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
          risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
          commendations: Array.isArray(parsed.commendations) ? parsed.commendations.map(String) : [],
          actions: Array.isArray(parsed.actions) ? parsed.actions.map(String) : [],
        };
      }
    } catch (err) {
      console.warn(`[ai/grade-insight] ${model} error:`, err.message);
    }
  }
  return null;
}

// ─── Hàm chính ───────────────────────────────────────────────────────────────
export async function generateGradeInsight({ user, scope, id, refresh = false }) {
  if (!VALID_SCOPES.has(scope)) throw httpError('scope không hợp lệ (student|class|cohort|system).');

  await ensureGradeInsightSchema();
  const { refId, student } = await resolveScopeAndAccess({ user, scope, id });
  const stats = await computeCompactStats({ scope, id: scope === 'student' ? id : refId, student });
  const metricsHash = hashStats(stats);

  if (!refresh) {
    const cached = await pool.query(
      `
      SELECT * FROM ai_grade_insights
      WHERE scope = $1 AND ref_id = $2 AND metrics_hash = $3
      ORDER BY generated_at DESC
      LIMIT 1
      `,
      [scope, refId, metricsHash]
    );
    if (cached.rows[0]) {
      return { ...formatRow(cached.rows[0]), cached: true };
    }
  }

  const ai = await callGemini(stats);
  const insight = ai || ruleBasedInsight(stats);
  const source = ai ? 'gemini' : 'rule_based';

  const saved = await pool.query(
    `
    INSERT INTO ai_grade_insights
      (scope, ref_id, metrics_hash, source, headline, trend, summary_md,
       highlights, risks, commendations, actions, stats_json)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb)
    ON CONFLICT (scope, ref_id, metrics_hash)
    DO UPDATE SET
      source = EXCLUDED.source,
      headline = EXCLUDED.headline,
      trend = EXCLUDED.trend,
      summary_md = EXCLUDED.summary_md,
      highlights = EXCLUDED.highlights,
      risks = EXCLUDED.risks,
      commendations = EXCLUDED.commendations,
      actions = EXCLUDED.actions,
      stats_json = EXCLUDED.stats_json,
      generated_at = NOW()
    RETURNING *
    `,
    [
      scope,
      refId,
      metricsHash,
      source,
      insight.headline,
      insight.trend,
      insight.summary_md,
      JSON.stringify(insight.highlights),
      JSON.stringify(insight.risks),
      JSON.stringify(insight.commendations),
      JSON.stringify(insight.actions),
      JSON.stringify(stats),
    ]
  );

  return { ...formatRow(saved.rows[0]), cached: false };
}

function formatRow(row) {
  return {
    scope: row.scope,
    id: row.ref_id,
    source: row.source,
    headline: row.headline,
    trend: row.trend,
    summary_md: row.summary_md,
    highlights: row.highlights || [],
    risks: row.risks || [],
    commendations: row.commendations || [],
    actions: row.actions || [],
    stats: row.stats_json || {},
    generated_at: row.generated_at,
  };
}
