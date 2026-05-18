import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:4000',
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
