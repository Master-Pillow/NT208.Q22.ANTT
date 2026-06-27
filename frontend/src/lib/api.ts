import axios from 'axios';

// Khi chạy local: VITE_API_URL chưa set → fallback localhost:4000
// Khi deploy production: VITE_API_URL = URL backend thật (vd: https://advisorhub-api.onrender.com)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Tự động gắn token vào header của mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Bắt lỗi nếu Backend báo token hết hạn hoặc không hợp lệ
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export interface AiQueryRequest {
  question: string;
}

export interface AiAnomalyFilters {
  classCode?: string;
  severity?: string;
  status?: string;
  anomalyType?: string;
}

export const runAiQuery = (payload: AiQueryRequest) =>
  apiClient.post('/ai/query', payload);

export const runAnomalyDetection = (classCode?: string) =>
  apiClient.post('/ai/anomalies/run', { classCode: classCode || undefined });

export const getAnomalies = (filters: AiAnomalyFilters = {}) =>
  apiClient.get('/ai/anomalies', { params: filters });

export const updateAnomalyStatus = (id: number | string, status: string) =>
  apiClient.patch(`/ai/anomalies/${id}/status`, { status });

export const getAnomalyPatterns = () => apiClient.get('/ai/anomaly-patterns');

export const generateAiBrief = (classCode: string) =>
  apiClient.post('/ai/briefs/generate', { classCode });

// ── AI phân tích điểm (grade insight) ───────────────────────────────────────
export type InsightScope = 'student' | 'class' | 'cohort' | 'system' | 'advisor';

export interface GradeInsight {
  scope: InsightScope;
  id: string;
  source: 'gemini' | 'rule_based';
  headline: string;
  trend: 'up' | 'down' | 'stable';
  summary_md: string;
  highlights: string[];
  risks: string[];
  commendations: string[];
  actions: string[];
  stats: any;
  generated_at: string;
  cached?: boolean;
}

export const getGradeInsight = (
  scope: InsightScope,
  id?: string | number,
  refresh = false
) =>
  apiClient.post<GradeInsight>('/ai/grade-insight', {
    scope,
    id: id !== undefined ? String(id) : undefined,
    refresh,
  });

// ── Metrics cấp khoá / toàn trường (admin) ──────────────────────────────────
export const getCohortMetrics = (cohort: string) =>
  apiClient.get(`/admin/metrics/cohort/${encodeURIComponent(cohort)}`);

export const getSystemMetrics = () => apiClient.get('/admin/metrics/system');

// Metrics tổng hợp của cố vấn (gộp mọi lớp phụ trách)
export const getAdvisorMetrics = () => apiClient.get('/advisor/metrics/overview');

// ── Metrics chi tiết 1 sinh viên ────────────────────────────────────────────
export interface StudentSemesterMetric {
  semester: string;
  gpa: number | null;
  avg_numeric: number | null;
  credits_total: number;
  credits_earned: number;
  credits_debt: number;
  failed: number;
  absent: number;
  in_progress: number;
  courses: number;
  graded_courses: number;
  gpa_drop: boolean;
  gpa_delta: number | null;
  commendation: string | null;
  cumulative_gpa?: number | null;
  cumulative_avg_numeric?: number | null;
}

export interface StudentMetricsData {
  student: { id: number; mssv: string; full_name: string; class_code: string } | null;
  cumulative_gpa: number | null;
  cumulative_avg_numeric: number | null;
  by_semester: StudentSemesterMetric[];
  grade_distribution: Record<string, number>;
  dropped_semesters: string[];
  improving: boolean;
  commendations: Array<{ semester: string; label: string; reason: string }>;
}

// Cố vấn xem metrics của 1 sinh viên trong lớp mình phụ trách
export const getAdvisorStudentMetrics = (studentId: number | string) =>
  apiClient.get<StudentMetricsData>(`/advisor/students/${studentId}/metrics`);

// UIT FAQ — public endpoint (no auth needed)
export const askUitFaq = (question: string, sessionId?: string) =>
  fetch(`${API_BASE_URL}/uit-faq/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId }),
  }).then((r) => r.json());

export const getUitFaqSuggestions = () =>
  fetch(`${API_BASE_URL}/uit-faq/suggestions`).then((r) => r.json());
