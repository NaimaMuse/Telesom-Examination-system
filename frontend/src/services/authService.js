import api from './api';

export const loginUser = (credentials) => api.post('/auth/login', credentials, {headers:{'X-Session-Mode':'cookie'}});

export const signupUser = (userData) => api.post('/auth/register', userData);
