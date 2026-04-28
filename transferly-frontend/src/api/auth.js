import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  headers: { 'Content-Type': 'application/json' }
});

// Ajoute le token JWT à chaque requête
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) => API.post('/register', data);
export const login = (data) => API.post('/login', data);
export const verifyOTP = (data) => API.post('/mfa/verify', data);
export const logout = () => API.post('/logout');
export const forgotPassword = (data) => API.post('/forgot-password', data);
export const resetPassword = (token, data) => API.post(`/reset-password/${token}`, data);

export default API;