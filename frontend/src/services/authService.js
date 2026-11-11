import api from './api';

export const loginUser = (credentials) => api.post(
  credentials.credential ? '/auth/google' : '/auth/login',
  credentials,
  {headers:{'X-Session-Mode':'cookie'}},
);

export const signupUser = (userData) => api.post('/auth/register', userData);
