import api from './api';

// Login user
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Register user
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Get current user
export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Update profile
export const updateProfile = async (userData) => {
  const response = await api.put('/auth/profile', userData);
  return response.data;
};

// Update password
export const updatePassword = async (passwordData) => {
  const response = await api.put('/auth/password', passwordData);
  return response.data;
};
