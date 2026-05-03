import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:4000', // Đảm bảo đúng port backend của bạn
});

// Tự động gắn token vào header của mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bắt lỗi nếu Backend báo Token hết hạn (401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Xóa dữ liệu cũ và reload lại trang để về màn hình Login
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

export default apiClient;