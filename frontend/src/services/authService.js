import api from './api';

export const loginUser = (credentials) => api.post('/auth/login', credentials);

export const signupUser = (userData) => api.post('/auth/register', userData);
