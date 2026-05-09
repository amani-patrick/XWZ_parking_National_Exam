import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('xwz_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('xwz_token');
      localStorage.removeItem('xwz_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  getUsers: (params) => api.get('/auth/users', { params }),
  toggleUser: (id) => api.patch(`/auth/users/${id}/toggle`),
};

export const parkingAPI = {
  create: (data) => api.post('/parkings', data),
  getAll: (params) => api.get('/parkings', { params }),
  getOne: (code) => api.get(`/parkings/${code}`),
  update: (code, data) => api.put(`/parkings/${code}`, data),
  delete: (code) => api.delete(`/parkings/${code}`),
};

export const entryAPI = {
  create: (data) => api.post('/entries', data),
  getAll: (params) => api.get('/entries', { params }),
  getOne: (id) => api.get(`/entries/${id}`),
  exit: (id, data) => api.patch(`/entries/${id}/exit`, data),
};

export const reportAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  outgoing: (params) => api.get('/reports/outgoing', { params }),
  entered: (params) => api.get('/reports/entered', { params }),
  parkingCars: (code, params) => api.get(`/reports/parking/${code}/cars`, { params }),
};

export default api;
