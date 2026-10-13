import api from './api';

/**
 * POST /api/auth/login
 *
 * Student login:  { studentId: "STD-1001" }
 * Staff login:    { email: "admin@telesom.com", password: "..." }
 *
 * Success response shape (from backend):
 * {
 *   success: true,
 *   token: "<jwt>",
 *   user: {
 *     _id, name, email, role, isActive, lastLogin,
 *     studentId?,        // present for students only
 *     studentProfileId?  // present for students only
 *   }
 * }
 */
export const loginUser = (credentials) => api.post('/auth/login', credentials);
