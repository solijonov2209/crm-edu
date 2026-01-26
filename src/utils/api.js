import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  logout: () => api.post('/auth/logout'),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  uploadPhoto: (id, formData) => api.put(`/users/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const teamsAPI = {
  getAll: (params) => api.get('/teams', { params }),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  uploadLogo: (id, formData) => api.put(`/teams/${id}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const playersAPI = {
  getAll: (params) => api.get('/players', { params }),
  getById: (id) => api.get(`/players/${id}`),
  getByTeam: (teamId) => api.get(`/players/team/${teamId}`),
  create: (data) => api.post('/players', data),
  update: (id, data) => api.put(`/players/${id}`, data),
  delete: (id) => api.delete(`/players/${id}`),
  uploadPhoto: (id, formData) => api.put(`/players/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateRatings: (id, data) => api.put(`/players/${id}/ratings`, data),
  updateStatistics: (id, data) => api.put(`/players/${id}/statistics`, data),
  updateInjury: (id, data) => api.put(`/players/${id}/injury`, data),
};

export const trainingsAPI = {
  getAll: (params) => api.get('/trainings', { params }),
  getById: (id) => api.get(`/trainings/${id}`),
  getStats: (teamId, params) => api.get(`/trainings/stats/${teamId}`, { params }),
  create: (data) => api.post('/trainings', data),
  update: (id, data) => api.put(`/trainings/${id}`, data),
  delete: (id) => api.delete(`/trainings/${id}`),
  updateAttendance: (id, data) => api.put(`/trainings/${id}/attendance`, data),
  uploadPhotos: (id, formData) => api.post(`/trainings/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadVideo: (id, formData) => api.post(`/trainings/${id}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const matchesAPI = {
  getAll: (params) => api.get('/matches', { params }),
  getById: (id) => api.get(`/matches/${id}`),
  getUpcoming: () => api.get('/matches/upcoming'),
  getStats: (teamId) => api.get(`/matches/stats/${teamId}`),
  create: (data) => api.post('/matches', data),
  update: (id, data) => api.put(`/matches/${id}`, data),
  delete: (id) => api.delete(`/matches/${id}`),
  updateLineup: (id, data) => api.put(`/matches/${id}/lineup`, data),
  addGoal: (id, data) => api.post(`/matches/${id}/goals`, data),
  addCard: (id, data) => api.post(`/matches/${id}/cards`, data),
  addSubstitution: (id, data) => api.post(`/matches/${id}/substitutions`, data),
  complete: (id, data) => api.put(`/matches/${id}/complete`, data),
};

export const dashboardAPI = {
  getAdminDashboard: () => api.get('/dashboard/admin'),
  getCoachDashboard: () => api.get('/dashboard/coach'),
  getPlayerPerformance: (id) => api.get(`/dashboard/player/${id}/performance`),
};

export const exportAPI = {
  playersExcel: (params) => api.get('/export/players/excel', {
    params,
    responseType: 'blob'
  }),
  playersPDF: (params) => api.get('/export/players/pdf', {
    params,
    responseType: 'blob'
  }),
  trainingsExcel: (params) => api.get('/export/trainings/excel', {
    params,
    responseType: 'blob'
  }),
  matchPDF: (id) => api.get(`/export/match/${id}/pdf`, {
    responseType: 'blob'
  }),
  teamStats: (id) => api.get(`/export/team/${id}/stats`, {
    responseType: 'blob'
  }),
};
