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