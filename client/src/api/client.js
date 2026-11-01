import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('neuroflow-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('neuroflow-token'); localStorage.removeItem('neuroflow-user');
    if (!['/login', '/register'].includes(window.location.pathname)) window.location.assign('/login');
  }
  return Promise.reject(error);
});
