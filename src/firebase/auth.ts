import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserPopupRedirectResolver,
  linkWithPopup,
  OAuthProvider
} from 'firebase/auth'
import { safeAuth } from './config'

// Electron IPC 타입 정의 (내부에서만 사용)
interface ElectronIPC {
  send: (channel: string, data: any) => void;
  sendSync: (channel: string, ...args: any[]) => any;
  on: (channel: string, func: (...args: any[]) => void) => void;
  once: (channel: string, func: (...args: any[]) => void) => void;
  invoke: (channel: string, data?: any) => Promise<any>;
}

// URL 로깅을 위한 XHR 가로채기 설정
function setupXhrLogging() {
  if (typeof window !== 'undefined') {
    // XHR 가로채기
    const originalOpen = XMLHttpRequest.prototype.open;
    // @ts-ignore - 타입 문제를 무시하고 함수를 오버라이드
    XMLHttpRequest.prototype.open = function() {
      const method = arguments[0];
      const url = arguments[1];
      
      if (url && typeof url === 'string' && 
          (url.includes('googleapis.com') || 
           url.includes('google.com') || 
           url.includes('firebase') || 
           url.includes('oauth') || 
           url.includes('auth'))) {
        console.log(`[XHR 요청] ${method} ${url}`);
      }
      // @ts-ignore
      return originalOpen.apply(this, arguments);
    };
    
    // Fetch API 가로채기
    const originalFetch = window.fetch;
    // @ts-ignore - 타입 문제를 무시하고 함수를 오버라이드
    window.fetch = function() {
      const url = arguments[0];
      const options = arguments[1];
      
      if (url && typeof url === 'string' && 
          (url.includes('googleapis.com') || 
           url.includes('google.com') || 
           url.includes('firebase') || 
           url.includes('oauth') || 
           url.includes('auth'))) {
        console.log(`[Fetch 요청] ${options?.method || 'GET'} ${url}`);
      }
      // @ts-ignore
      return originalFetch.apply(this, arguments);
    };
    
    console.log('[로깅] 네트워크 요청 로깅이 설정되었습니다.');
  }
}

// 로깅 설정 실행
setupXhrLogging();

// Google OAuth 토큰 타입
export interface GoogleToken {
  accessToken: string
  refreshToken?: string
  expirationTime?: number
}

// Google 스프레드시트 파일 타입
export interface GoogleSheet {
  id: string
  name: string
}

// 환경 확인 (Electron인지 체크)
const isElectron = typeof window !== 'undefined' && window.electron !== undefined;
console.log('[Firebase] Electron 환경 확인:', isElectron);

// Windows OS 감지 (플랫폼 제약 문제에 대비)
const isWindows = typeof navigator !== 'undefined' && navigator.platform && 
                 (navigator.platform.includes('Win') || navigator.userAgent.includes('Windows'));
console.log('[Firebase] Windows OS 감지:', isWindows);

// 오프라인 모드 확인
const isOfflineMode = () => localStorage.getItem('firebaseOfflineMode') === 'true';

// 토큰 타입 정의
export interface GoogleToken {
  accessToken: string;
  expirationTime?: number;
}

// API 오류 자동 처리 함수
function handleApiError(error: any) {
  console.error('[Firebase] API 오류 발생:', error);
  
  // Windows에서 특정 오류가 발생하면 자동으로 오프라인 모드로 전환
  if (isWindows && 
     (error.message?.includes('network') || 
      error.message?.includes('cors') || 
      error.message?.includes('initialization') || 
      error.code === 'auth/network-request-failed')) {
    console.warn('[Firebase] Windows에서 네트워크 오류 감지. 오프라인 모드로 자동 전환합니다.');
    localStorage.setItem('firebaseOfflineMode', 'true');
    return true;
  }
  
  return false;
}

// 구글 로그인
export const signInWithGoogle = async (): Promise<GoogleToken> => {
  console.log('[Firebase] Google 로그인 시도...');
  
  // 오프라인 모드 확인
  if (isOfflineMode()) {
    console.log('[Firebase] 오프라인 모드에서 가상 토큰 사용');
    const mockToken: GoogleToken = {
      accessToken: 'offline-mode-token',
      expirationTime: Date.now() + 3600 * 1000 // 1시간 후 만료
    };
    localStorage.setItem('googleAuthToken', JSON.stringify(mockToken));
    return mockToken;
  }
  
  try {
    // Electron 환경에서는 다른 방식으로 처리
    if (isElectron) {
      console.log('[Firebase] Electron 환경에서 로그인 처리');
      // 저장된 토큰이 있으면 재사용
      const savedToken = localStorage.getItem('googleAuthToken');
      if (savedToken) {
        try {
          const token = JSON.parse(savedToken) as GoogleToken;
          // 현재 시간이 만료 시간보다 작으면 토큰 재사용
          if (token.expirationTime && token.expirationTime > Date.now()) {
            console.log('[Firebase] 저장된 토큰 사용 (만료 전)');
            return token;
          }
        } catch (e) {
          console.error('[Firebase] 저장된 토큰 파싱 오류:', e);
        }
      }
      
      // Windows에서는 특별 처리
      if (isWindows) {
        console.log('[Firebase] Windows 환경에서는 자동 오프라인 모드 권장');
        console.log('[Firebase] 테스트 토큰 사용 (윈도우 호환성)');
        const mockToken: GoogleToken = {
          accessToken: 'windows-compat-token',
          expirationTime: Date.now() + 3600 * 1000 // 1시간 후 만료
        };
        localStorage.setItem('googleAuthToken', JSON.stringify(mockToken));
        
        // 오프라인 모드 제안 (콘솔에 표시)
        console.warn('[Firebase] 안내: 안정적인 사용을 위해 localStorage.setItem("firebaseOfflineMode", "true")를 실행하세요');
        
        return mockToken;
      }
      
      // 일반 Electron 환경에서 테스트 토큰 사용
      console.log('[Firebase] Electron 환경에서 테스트 토큰 사용 (개발용)');
      const mockToken: GoogleToken = {
        accessToken: 'mock-token-for-development',
        expirationTime: Date.now() + 3600 * 1000 // 1시간 후 만료
      };
      localStorage.setItem('googleAuthToken', JSON.stringify(mockToken));
      return mockToken;
    }
    
    // 웹 환경에서는 팝업으로 로그인
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive');
    
    // safeAuth 함수는 항상 유효한 Auth 객체 또는 모의 객체를 반환함
    const result = await signInWithPopup(safeAuth(), provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential) {
      throw new Error('인증 정보를 가져올 수 없습니다.');
    }
    
    const token: GoogleToken = {
      accessToken: credential.accessToken || '',
      expirationTime: Date.now() + 3600 * 1000 // 1시간 후 만료
    };
    
    localStorage.setItem('googleAuthToken', JSON.stringify(token));
    console.log('[Firebase] Google 로그인 성공');
    return token;
  } catch (error: any) {
    console.error('[Firebase] Google 로그인 오류:', error);
    
    // 자동 오류 처리 (오프라인 모드 전환 등)
    if (handleApiError(error)) {
      console.log('[Firebase] 오류 발생 후 오프라인 모드 전환, 가상 토큰 발급');
      const fallbackToken: GoogleToken = {
        accessToken: 'error-recovery-token',
        expirationTime: Date.now() + 3600 * 1000
      };
      localStorage.setItem('googleAuthToken', JSON.stringify(fallbackToken));
      return fallbackToken;
    }
    
    throw error;
  }
};

// 현재 사용자 가져오기
export const getCurrentUser = () => {
  try {
    // 오프라인 모드에서는 가상 사용자 반환
    if (isOfflineMode()) {
      return { uid: 'offline-user-id', displayName: 'Offline User' };
    }
    
    // safeAuth는 항상 유효한 객체를 반환
    return safeAuth().currentUser;
  } catch (error) {
    console.error('[Firebase] 현재 사용자 확인 오류:', error);
    return null;
  }
};

// 리디렉션 결과 확인
export const checkRedirectResult = async () => {
  try {
    // 오프라인 모드 확인
    if (isOfflineMode()) {
      console.log('[Firebase] 오프라인 모드에서 리디렉션 결과 확인 건너뜀');
      const savedToken = localStorage.getItem('googleAuthToken');
      if (savedToken) {
        return JSON.parse(savedToken);
      }
      
      // 토큰이 없으면 생성
      const mockToken: GoogleToken = {
        accessToken: 'offline-mode-token',
        expirationTime: Date.now() + 3600 * 1000
      };
      localStorage.setItem('googleAuthToken', JSON.stringify(mockToken));
      return mockToken;
    }
    
    // 저장된 토큰 확인
    const savedToken = localStorage.getItem('googleAuthToken');
    if (savedToken) {
      try {
        const token = JSON.parse(savedToken);
        if (token.accessToken) {
          console.log('[Firebase] 저장된 토큰 발견');
          return token;
        }
      } catch (e) {
        console.error('[Firebase] 저장된 토큰 파싱 오류:', e);
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Firebase] 리디렉션 결과 확인 오류:', error);
    
    // 자동 오류 처리
    if (handleApiError(error)) {
      console.log('[Firebase] 리디렉션 검사 오류 후 오프라인 모드 전환, 가상 토큰 사용');
      const fallbackToken: GoogleToken = {
        accessToken: 'error-recovery-token',
        expirationTime: Date.now() + 3600 * 1000
      };
      localStorage.setItem('googleAuthToken', JSON.stringify(fallbackToken));
      return fallbackToken;
    }
    
    return null;
  }
};

// 로그아웃 처리
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    // 오프라인 모드에서는 로컬 스토리지만 정리
    if (isOfflineMode()) {
      localStorage.removeItem('googleAuthToken');
      return;
    }
    
    await signOut(safeAuth())
    // 로그아웃 시 로컬 스토리지에서 토큰 삭제
    localStorage.removeItem('googleAuthToken');
  } catch (error) {
    console.error('로그아웃 실패:', error)
    
    // 자동 오류 처리
    handleApiError(error);
    
    // 로컬 스토리지 항상 정리 (오류가 발생해도)
    localStorage.removeItem('googleAuthToken');
  }
}

// 시트 목록 가져오기
export const fetchGoogleSheetsList = async (token: GoogleToken): Promise<GoogleSheet[]> => {
  try {
    // 오프라인 모드에서는 샘플 데이터 반환
    if (isOfflineMode()) {
      console.log('[Firebase] 오프라인 모드에서 가상 스프레드시트 목록 반환');
      return [
        { id: 'offline-sheet-1', name: '오프라인 시트 1' },
        { id: 'offline-sheet-2', name: '오프라인 시트 2' }
      ];
    }
    
    console.log("사용 중인 액세스 토큰:", token.accessToken.substring(0, 10) + "...");
    
    // 구글 드라이브 API 호출
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=files(id%2Cname)',
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`
        }
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API 응답 전문:", errorText);
      throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('스프레드시트 목록 가져오기 실패:', error);
    
    // 자동 오류 처리
    if (handleApiError(error)) {
      console.log('[Firebase] API 오류 후 가상 스프레드시트 목록 반환');
      return [
        { id: 'error-recovery-sheet', name: '오류 복구 시트' }
      ];
    }
    
    throw error;
  }
} 