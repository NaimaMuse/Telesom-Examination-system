import { publishAssessmentChange } from './assessmentChanges.mjs';
import axios from 'axios';

/**
 * Central Axios instance.
 * VITE_API_URL from .env (defaults to /api, which Vite proxies to localhost:5000)
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Academic-Terminology': 'cohort',
  },
});

api.interceptors.response.use(
  (response) => publishAssessmentChange(response),
  (error) => {
    if (error.response?.status === 401 && !['/auth/login','/auth/google','/auth/session'].includes(error.config?.url)) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
