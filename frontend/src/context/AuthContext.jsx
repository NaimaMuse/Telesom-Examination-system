import {createContext,useContext,useState,useCallback,useEffect,useRef} from 'react';
import {loginUser,signupUser} from '../services/authService';
import api from '../services/api';

const AuthContext = createContext(null);
const tabAccountKey = 'telesom:signed-in-account';

export function AuthProvider({children}) {
  const [user,setUser] = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const bootstrap = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    bootstrap.current = controller;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const clearAuth = () => {
      sessionStorage.removeItem(tabAccountKey);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized',clearAuth);
    const tabAccount = sessionStorage.getItem(tabAccountKey);
    if (tabAccount) {
      api.get('/auth/session',{signal:controller.signal})
        .then(({data}) => {
          if (controller.signal.aborted) return;
          if (String(data.user?._id) === tabAccount) setUser(data.user);
          else clearAuth();
        })
        .catch(error => {
          if (!controller.signal.aborted && [401,403].includes(error.response?.status)) clearAuth();
        })
        .finally(() => { if (!controller.signal.aborted) setAuthLoading(false); });
    } else {
      setAuthLoading(false);
    }
    return () => {
      controller.abort();
      window.removeEventListener('auth:unauthorized',clearAuth);
    };
  },[]);

  const login = useCallback(async credentials => {
    bootstrap.current?.abort();
    try {
      const {data} = await loginUser(credentials);
      sessionStorage.setItem(tabAccountKey,String(data.user._id));
      setUser(data.user);
      return data.user;
    } finally {
      setAuthLoading(false);
    }
  },[]);

  const signup = useCallback(async userData => (await signupUser(userData)).data,[]);
  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    sessionStorage.removeItem(tabAccountKey);
    setUser(null);
  },[]);
  const updateUser = useCallback(updates => setUser(current => current ? {...current,...updates} : null),[]);
  const updateSession = useCallback((_unusedToken,updates) => updateUser(updates),[updateUser]);

  return <AuthContext.Provider value={{user,authLoading,isAuthenticated:Boolean(user),login,logout,signup,updateUser,updateSession}}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
