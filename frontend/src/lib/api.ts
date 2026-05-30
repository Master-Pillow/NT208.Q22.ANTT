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

// UIT FAQ — public endpoint (no auth needed)
export const askUitFaq = (question: string, sessionId?: string) =>
  fetch(`${API_BASE_URL}/uit-faq/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId }),
  }).then((r) => r.json());

export const getUitFaqSuggestions = () =>
  fetch(`${API_BASE_URL}/uit-faq/suggestions`).then((r) => r.json());
