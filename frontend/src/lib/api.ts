// src/lib/api.ts
import axios from 'axios';

const apiClient = axios.create({
  // Vite sử dụng import.meta.env để đọc biến môi trường thay vì process.env
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;