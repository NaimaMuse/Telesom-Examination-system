import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser, signupUser } from '../services/authService';

/**
 * AuthContext — MERN Stack Authentication State Provider.
 *
 * Provides: { user, token, login, signup, logout, isAuthenticated }
 *
 * Persists token and user session in localStorage, attaching bearer tokens
 * via Axios interceptors.
 */
const AuthContext = createContext(null);

const loadStoredAuth = () => {
  try {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson && token.split('.').length === 3) {
      return { token, user: JSON.parse(userJson) };
    }
  } catch {
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

    // Role comes from backend verification
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setAuth({ token: newToken, user: newUser });

    return newUser;
  }, []);

  /**
   * signup()
   * @param {Object} userData - registration details (name, email, studentId/phone, etc.)
   * @returns {Object} registration response data
   */
  const signup = useCallback(async (userData) => {
    const response = await signupUser(userData);

    // If backend returns immediate login token on registration:
    if (response.data?.token && response.data?.user) {
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setAuth({ token: newToken, user: newUser });
    }

    return response.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ token: null, user: null });
  }, []);

  const updateUser = useCallback((updated) => {
    setAuth(current => {
      const nextUser = { ...current.user, ...updated };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return { ...current, user: nextUser };
    });
  }, []);

  const updateSession = useCallback((newToken, updates) => {
    localStorage.setItem('token', newToken);
    setAuth(current => {const nextUser={...current.user,...updates};localStorage.setItem('user',JSON.stringify(nextUser));return {token:newToken,user:nextUser};});
  }, []);
  const value = {
    updateSession,
    updateUser,
    user,
    token,
    login,
    signup,
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
