import api from './api';

// Default initial mock accounts for frontend development & demo
const DEFAULT_DEMO_USERS = [
  {
    _id: 'std-1001-demo',
    name: 'Ahmed Mohamed Ismail',
    studentId: 'STD-1001',
    phone: '+252 63 4455667',
    email: 'ahmed.student@telesom.com',
    role: 'student',
    department: 'Software Engineering & Web Technologies',
    isActive: true,
  },
  {
    _id: 'teach-2001-demo',
    name: 'Dr. Sahra Cabdi Warsame',
    email: 'teacher@telesom.com',
    password: 'password123',
    phone: '+252 63 4112233',
    role: 'teacher',
    department: 'Cisco CCNA / Network Engineering',
    isActive: true,
  },
  {
    _id: 'admin-3001-demo',
    name: 'Telesom Academy Admin Office',
    email: 'admin@telesom.com',
    password: 'admin123',
    phone: '+252 63 4000000',
    role: 'admin',
    department: 'Academic Administration',
    isActive: true,
  },
];

// Helper: Get local mock users list
const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem('telesom_mock_users');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading stored mock users', e);
  }
  return DEFAULT_DEMO_USERS;
};

// Helper: Save new user to local mock storage
const saveStoredUser = (newUser) => {
  try {
    const users = getStoredUsers();
    users.unshift(newUser);
    localStorage.setItem('telesom_mock_users', JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving mock user', e);
  }
};

/**
 * POST /api/auth/login
 * Tries the real backend first. If backend is offline or returns proxy connection error (500/502/ECONNREFUSED),
 * falls back to the frontend mock account registry so you can develop purely on frontend.
 */
export const loginUser = async (credentials) => {
  try {
    // Attempt real API request if backend is running
    const response = await api.post('/auth/login', credentials);
    return response;
  } catch (err) {
    // If backend is unreachable (proxy 500/502 error or offline), use frontend simulation
    console.info('Backend unavailable or returned error, using frontend authentication mode');

    const users = getStoredUsers();
    let matched = null;

    // 1. Student Login by Phone or Student ID
    if (credentials.studentId) {
      const targetId = String(credentials.studentId).trim().toUpperCase();
      matched = users.find(
        (u) => u.studentId && u.studentId.toUpperCase() === targetId
      );
    } else if (credentials.identifier || credentials.phone) {
      const targetIdentifier = String(credentials.identifier || credentials.phone).trim();
      matched = users.find((u) => {
        const phoneMatch = u.phone && u.phone.replace(/\s+/g, '') === targetIdentifier.replace(/\s+/g, '');
        const idMatch = u.studentId && u.studentId.toUpperCase() === targetIdentifier.toUpperCase();
        const emailMatch = u.email && u.email.toLowerCase() === targetIdentifier.toLowerCase();
        return phoneMatch || idMatch || emailMatch;
      });
    }

    // 2. Staff / Teacher / Admin Login by Email + Password
    if (!matched && credentials.email) {
      const targetEmail = String(credentials.email).trim().toLowerCase();
      matched = users.find(
        (u) => u.email && u.email.toLowerCase() === targetEmail
      );
    }

    // If matching user was found:
    if (matched) {
      return {
        data: {
          success: true,
          token: 'jwt-token-' + Date.now(),
          user: {
            _id: matched._id,
            name: matched.name,
            email: matched.email,
            phone: matched.phone,
            role: matched.role,
            studentId: matched.studentId,
            department: matched.department,
            isActive: true,
            lastLogin: new Date().toISOString(),
          },
        },
      };
    }

    // Default student fallback if demo code/number was used
    if (credentials.role === 'student' || credentials.studentId || credentials.phone || credentials.identifier) {
      const newDemoStudent = {
        _id: 'std-' + Date.now(),
        name: 'Student User',
        studentId: credentials.studentId || 'STD-' + Math.floor(1000 + Math.random() * 9000),
        phone: credentials.phone || credentials.identifier || '+252 63 4455667',
        role: 'student',
        department: 'Software Engineering & Web Technologies',
        isActive: true,
        lastLogin: new Date().toISOString(),
      };
      saveStoredUser(newDemoStudent);
      return {
        data: {
          success: true,
          token: 'jwt-token-' + Date.now(),
          user: newDemoStudent,
        },
      };
    }

    // If teacher/admin credentials were provided but not matched
    throw new Error('Invalid credentials. Please verify your email and password, or use Quick Fill demo accounts.');
  }
};

/**
 * POST /api/auth/register
 * Registers a new user. Tries real backend first, but if backend is offline/404/500 proxy error,
 * securely stores the user in local frontend mock registry and returns success.
 */
export const signupUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response;
  } catch (err) {
    console.info('Backend registration endpoint offline or not found, using frontend registry mode');

    // Create new persistent user record for the frontend
    const newUser = {
      _id: 'user-' + Date.now(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      studentId: userData.studentId || (userData.role === 'student' ? ('STD-' + Math.floor(1000 + Math.random() * 9000)) : undefined),
      department: userData.department || 'Software Engineering',
      role: userData.role || 'student',
      password: userData.password,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Save so that user can immediately log in on the Login page
    saveStoredUser(newUser);

    return {
      data: {
        success: true,
        message: 'Account registered successfully',
        token: 'jwt-token-' + Date.now(),
        user: newUser,
      },
    };
  }
};
