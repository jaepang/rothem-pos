import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { signInWithGoogle, getCurrentUser, GoogleToken } from './auth';

interface AuthContextType {
  isLoggedIn: boolean;
  token: GoogleToken | null;
  refreshToken: () => Promise<GoogleToken | null>;
  logout: () => Promise<void>;
  tokenExpired: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  refreshToken: async () => null,
  logout: async () => {},
  tokenExpired: false
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

const checkTokenExpired = (token: GoogleToken | null): boolean => {
  if (!token) return true;
  if (!token.expirationTime) return true;
  
  const nowPlusBuffer = Date.now() + 5 * 60 * 1000;
  
  const expirationTime = token.expirationTime;
  
  return expirationTime < nowPlusBuffer;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<GoogleToken | null>(null);
  const [tokenExpired, setTokenExpired] = useState(true);
  
  const refreshToken = useCallback(async (): Promise<GoogleToken | null> => {
    console.log('[Auth] 토큰 갱신 시도');
    try {
      const newToken = await signInWithGoogle();
      setToken(newToken);
      setIsLoggedIn(true);
      setTokenExpired(false);
      console.log('[Auth] 토큰 갱신 성공', 
        `만료 시간: ${newToken.expirationTime ? new Date(newToken.expirationTime).toLocaleTimeString() : '알 수 없음'}`);
      return newToken;
    } catch (error) {
      console.error('[Auth] 토큰 갱신 실패:', error);
      setTokenExpired(true);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkTokenStatus = () => {
      if (token) {
        const expired = checkTokenExpired(token);
        setTokenExpired(expired);
        
        if (expired) {
          console.log('[Auth] 토큰이 만료되었거나 곧 만료될 예정');
        }
      }
    };
    
    checkTokenStatus();
    
    const intervalId = setInterval(checkTokenStatus, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (isLoggedIn && tokenExpired) {
      const autoRefresh = async () => {
        console.log('[Auth] 토큰 자동 갱신 시도');
        await refreshToken();
      };
      
      autoRefresh();
    }
  }, [isLoggedIn, tokenExpired, refreshToken]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const user = getCurrentUser();
      if (user) {
        setIsLoggedIn(true);
        try {
          const newToken = await signInWithGoogle();
          setToken(newToken);
          setTokenExpired(false);
          console.log('[Auth] 초기 토큰 획득 성공');
        } catch (error) {
          console.error('[Auth] 초기 토큰 획득 실패:', error);
          setTokenExpired(true);
        }
      }
    };

    checkAuthStatus();
  }, []);

  const logout = async (): Promise<void> => {
    setToken(null);
    setIsLoggedIn(false);
    setTokenExpired(true);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, refreshToken, logout, tokenExpired }}>
      {children}
    </AuthContext.Provider>
  );
}; 