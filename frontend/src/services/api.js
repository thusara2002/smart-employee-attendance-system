import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
  createStaff: (data) => api.post('/auth/create-staff', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  uploadProfileImage: (profileImage) => api.post('/auth/profile-image', { profileImage }),
};

// Employee API
export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getActive: () => api.get('/employees/active'),
  getActiveCount: () => api.get('/employees/count/active'),
  getById: (id) => api.get(`/employees/${id}`),
  getByEmployeeId: (employeeId) => api.get(`/employees/by-employee-id/${employeeId}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  registerFace: (employeeId, faceData) =>
    api.post('/employees/register-face', {
      employeeId,
      primaryDescriptor: faceData.primaryDescriptor,
      allDescriptors: faceData.allDescriptors,
      captureCount: faceData.captureCount
    }),
  uploadProfileImage: (id, profileImage) =>
    api.post(`/employees/${id}/profile-image`, { profileImage }),
  getMyQR: () => api.get('/employees/my-qr'),
};

// Attendance API
export const attendanceAPI = {
  markByQR: (qrCode) => api.post('/attendance/kiosk/qr', { qrCode }),
  markByFace: (faceDescriptor) => api.post('/attendance/kiosk/face', { faceDescriptor }),
  markManual: (data) => api.post('/attendance/manual', data),
  getToday: () => api.get('/attendance/today'),
  getByDate: (date) => api.get(`/attendance/date/${date}`),
  getByRange: (startDate, endDate) =>
    api.get('/attendance/range', { params: { startDate, endDate } }),
  getEmployeeAttendance: (employeeId) => api.get(`/attendance/employee/${employeeId}`),
  getEmployeeAttendanceByRange: (employeeId, startDate, endDate) =>
    api.get(`/attendance/employee/${employeeId}/range`, { params: { startDate, endDate } }),
  getSummary: (date) => api.get('/attendance/summary', { params: { date } }),
  getMyToday: () => api.get('/attendance/my-today'),
  getRecent: (employeeId, limit) => api.get(`/attendance/employee/${employeeId}/recent`, { params: { limit } }),
};

// Leave API
export const leaveAPI = {
  request: (data) => api.post('/leaves', null, { params: data }),
  getAll: () => api.get('/leaves'),
  getPending: () => api.get('/leaves/pending'),
  getMyLeaves: () => api.get('/leaves/my-leaves'),
  getMyRecentLeaves: (limit) => api.get('/leaves/my-recent-leaves', { params: { limit } }),
  getEmployeeLeaves: (employeeId) => api.get(`/leaves/employee/${employeeId}`),
  approve: (id, comments) => api.put(`/leaves/${id}/approve`, null, { params: { comments } }),
  reject: (id, reason) => api.put(`/leaves/${id}/reject`, null, { params: { reason } }),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
};

// Shift API
export const shiftAPI = {
  getAll: () => api.get('/shifts'),
  getActive: () => api.get('/shifts/active'),
  getById: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', null, { params: data }),
  update: (id, data) => api.put(`/shifts/${id}`, null, { params: data }),
  delete: (id) => api.delete(`/shifts/${id}`),
};

// Notification API
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnread: () => api.get('/notifications/unread'),
  getUnreadCount: () => api.get('/notifications/count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Report API
export const reportAPI = {
  getDaily: (date) => api.get('/reports/daily', { params: { date } }),
  getWeekly: (startDate) => api.get('/reports/weekly', { params: { startDate } }),
  getMonthly: (year, month) => api.get('/reports/monthly', { params: { year, month } }),
  download: (startDate, endDate, format = 'csv') =>
    api.get('/reports/download', {
      params: { startDate, endDate, format },
      responseType: 'blob'
    }),
  downloadExcel: (startDate, endDate) =>
    api.get('/reports/download-excel', {
      params: { startDate, endDate },
      responseType: 'blob'
    }),
  downloadEmployeeExcel: (employeeId, startDate, endDate) =>
    api.get(`/reports/download-excel/employee/${employeeId}`, {
      params: { startDate, endDate },
      responseType: 'blob'
    }),
  getDepartment: (department, startDate, endDate) =>
    api.get(`/reports/department/${department}`, { params: { startDate, endDate } }),
};

export default api;
