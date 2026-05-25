import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — check if we have a saved token, and verify it
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        // Verify token is still valid by calling /auth/me
        try {
          console.log('[Auth] Verifying token via /auth/me...', { token: savedToken.substring(0,10) + '...' });
          const response = await getMe();
          console.log('[Auth] /auth/me success:', response);
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } catch (error) {
          console.error('[Auth] /auth/me failed:', error.message, error.response?.status);
          // ONLY clear token if the server explicitly rejects it (401/403)
          // Do NOT clear on network errors, 500s, or Railway wake-up timeouts
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn('[Auth] Token rejected (401/403). Clearing session and redirecting.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          } else {
            console.log('[Auth] Non-401 error. Keeping session active.');
          }
        }
      } else {
        console.log('[Auth] No saved token or user found in localStorage.');
      }

      console.log('[Auth] initAuth complete. Setting loading to false.');
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (userData, tokenData) => {
    console.log('[Auth] login called. Setting state and localStorage.', { token: tokenData.substring(0,10) + '...' });
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
