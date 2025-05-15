import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { signInWithGoogle, getCurrentUser, GoogleToken } from './auth';
import { isOfflineMode } from './dataService';

interface AuthContextType {
  isLoggedIn: boolean;
  token: GoogleToken | null;
  refreshToken: () => Promise<GoogleToken | null>;
  logout: () => Promise<void>;
  tokenExpired: boolean;
  offlineMode: boolean;
  setOfflineMode: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  token: null,
  refreshToken: async () => null,
  logout: async () => {},
  tokenExpired: false,
  offlineMode: false,
  setOfflineMode: () => {}
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
  const [offlineMode, setOfflineMode] = useState(() => isOfflineMode());
  
  // 오프라인 모드 설정 함수
  const updateOfflineMode = useCallback((enabled: boolean) => {
    console.log(`[Auth] 오프라인 모드 ${enabled ? '활성화' : '비활성화'}`);
    localStorage.setItem('firebaseOfflineMode', enabled ? 'true' : 'false');
    setOfflineMode(enabled);
    
    // 오프라인 모드가 활성화되면 항상 로그인되어 있는 것으로 간주
    if (enabled) {
      if (!token) {
        // 가짜 토큰 생성 (1일 유효)
        const mockToken: GoogleToken = {
          accessToken: 'offline-mode-token',
          expirationTime: Date.now() + 86400000
        };
        setToken(mockToken);
        localStorage.setItem('googleAuthToken', JSON.stringify(mockToken));
      }
      setIsLoggedIn(true);
      setTokenExpired(false);
    }
  }, [token]);
  
  const refreshToken = useCallback(async (): Promise<GoogleToken | null> => {
    // 오프라인 모드에서는 토큰 갱신 필요 없음
    if (offlineMode) {
      console.log('[Auth] 오프라인 모드에서는 토큰 갱신을 건너뜁니다');
      // 오프라인 토큰이 없으면 생성
      if (!token) {
        const mockToken: GoogleToken = {
          accessToken: 'offline-mode-token',
          expirationTime: Date.now() + 86400000
        };
        setToken(mockToken);
        setIsLoggedIn(true);
        setTokenExpired(false);
        localStorage.setItem('googleAuthToken', JSON.stringify(mockToken));
      }
      return token;
    }
    
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
      
      // 토큰 갱신 실패 시 오프라인 모드 제안
      console.warn('[Auth] 토큰 갱신 실패. 오프라인 모드 사용을 고려하세요. localStorage.setItem("firebaseOfflineMode", "true")');
      
      setTokenExpired(true);
      return null;
    }
  }, [token, offlineMode]);

  useEffect(() => {
    const checkTokenStatus = () => {
      // 오프라인 모드에서는 토큰 상태 체크 건너뜀
      if (offlineMode) {
        setTokenExpired(false);
        return;
      }
      
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
  }, [token, offlineMode]);

  useEffect(() => {
    // 오프라인 모드에서는 자동 토큰 갱신 건너뜀
    if (offlineMode) {
      return;
    }
    
    if (isLoggedIn && tokenExpired) {
      const autoRefresh = async () => {
        console.log('[Auth] 토큰 자동 갱신 시도');
        await refreshToken();
      };
      
      autoRefresh();
    }
  }, [isLoggedIn, tokenExpired, refreshToken, offlineMode]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      // 오프라인 모드 확인
      const offlineModeEnabled = isOfflineMode();
      if (offlineModeEnabled !== offlineMode) {
        setOfflineMode(offlineModeEnabled);
      }
      
      // 오프라인 모드에서는 항상 로그인된 것으로 간주
      if (offlineModeEnabled) {
        console.log('[Auth] 오프라인 모드 감지됨, 자동 로그인 처리');
        let offlineToken = null;
        
        // 저장된 토큰 확인 또는 생성
        try {
          const savedTokenStr = localStorage.getItem('googleAuthToken');
          if (savedTokenStr) {
            offlineToken = JSON.parse(savedTokenStr) as GoogleToken;
          } else {
            offlineToken = {
              accessToken: 'offline-mode-token',
              expirationTime: Date.now() + 86400000 // 24시간
            };
            localStorage.setItem('googleAuthToken', JSON.stringify(offlineToken));
          }
        } catch (e) {
          console.warn('[Auth] 오프라인 토큰 처리 오류:', e);
          offlineToken = {
            accessToken: 'offline-mode-token',
            expirationTime: Date.now() + 86400000
          };
          localStorage.setItem('googleAuthToken', JSON.stringify(offlineToken));
        }
        
        setToken(offlineToken);
        setIsLoggedIn(true);
        setTokenExpired(false);
        return;
      }
      
      // 일반 모드에서는 정상적인 인증 확인
      const user = getCurrentUser();
      if (user) {
        setIsLoggedIn(true);
        try {
          const savedTokenStr = localStorage.getItem('googleAuthToken');
          if (savedTokenStr) {
            const savedToken = JSON.parse(savedTokenStr) as GoogleToken;
            setToken(savedToken);
            setTokenExpired(checkTokenExpired(savedToken));
            console.log('[Auth] 저장된 토큰 사용');
          } else {
            console.log('[Auth] 저장된 토큰 없음, 토큰 만료 상태로 설정');
            setTokenExpired(true);
          }
        } catch (error) {
          console.error('[Auth] 토큰 확인 실패:', error);
          setTokenExpired(true);
        }
      }
    };

    checkAuthStatus();
  }, [offlineMode]);

  const logout = async (): Promise<void> => {
    setToken(null);
    setIsLoggedIn(false);
    setTokenExpired(true);
    if (offlineMode) {
      // 오프라인 모드 비활성화 선택 가능
      console.log('[Auth] 오프라인 모드에서 로그아웃');
      localStorage.removeItem('googleAuthToken');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      token, 
      refreshToken, 
      logout, 
      tokenExpired,
      offlineMode,
      setOfflineMode: updateOfflineMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 