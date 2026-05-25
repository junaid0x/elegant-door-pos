import axios from 'axios';

// Use production environment variable if available, fallback to local proxy path
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log(`[Axios] Request to ${config.url} with token:`, token ? 'YES' : 'NO');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401s globally
api.interceptors.response.use(
  (response) => {
    console.log(`[Axios] Response from ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`[Axios] Error from ${error.config?.url} - Status:`, error.response?.status);
    if (error.response?.status === 401) {
      console.warn('[Axios] 401 Intercepted. Removing token and redirecting to /login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
