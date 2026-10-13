import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser } from '../services/authService';

/**
 * AuthContext
 *
 * Provides: { user, token, login, logout, isAuthenticated }
 *
 * NOTE: Token storage in localStorage is convenient but not perfectly secure.
 * For this project it satisfies academic management needs. For high-security
 * production systems, httpOnly cookies should be considered.
 */
const AuthContext = createContext(null);

const loadStoredAuth = () => {
  try {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      return { token, user: JSON.parse(userJson) };
    }
  } catch {
    // Corrupted data — clear it
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return { token: null, user: null };
};

export function AuthProvider({ children }) {
  const [{ token, user }, setAuth] = useState(loadStoredAuth);

  /**
   * login()
   * @param {Object} credentials - { studentId } OR { email, password }
   * @returns {Object} user object from backend
   */
  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials);
    const { token: newToken, user: newUser } = response.data;

    // The role comes from the backend — never trusted from the frontend selector
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setAuth({ token: newToken, user: newUser });

    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ token: null, user: null });
  }, []);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: Boolean(token && user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — convenience hook to consume AuthContext.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
