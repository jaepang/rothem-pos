import { initializeApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

// 환경 감지
const isElectron = typeof window !== 'undefined' && window.electron !== undefined;
console.log('[Firebase Config] Electron 환경 감지:', isElectron);

// Windows OS 감지
const isWindows = typeof navigator !== 'undefined' && navigator.platform && 
                 (navigator.platform.includes('Win') || navigator.userAgent.includes('Windows'));
console.log('[Firebase Config] Windows OS 감지:', isWindows);

// Firebase 설정
export const firebaseConfig = {
  apiKey: "AIzaSyRoMOGShBc2nADK3CT0W0Y1OEuvJ2NrLA",
  authDomain: "rothem-acd02.firebaseapp.com",
  projectId: "rothem-acd02",
  storageBucket: "rothem-acd02.appspot.com",
  messagingSenderId: "114131153898",
  appId: "1:114131153898:web:24ed26ea75c46c4c6b7c3"
};

// OAuth 설정
export const oauthConfig = {
  clientId: "114131153898-web24ed26ea75c46c4c6b7c3.apps.googleusercontent.com",
  redirectUri: "urn:ietf:wg:oauth:2.0:oob",
  directRedirectUri: "http://localhost:5173/auth/callback"
};

// 오프라인 모드 확인
const isOfflineMode = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  return localStorage.getItem('firebaseOfflineMode') === 'true';
};

// 초기화 전 오프라인 모드 확인
console.log('[Firebase Config] 오프라인 모드 상태:', isOfflineMode());

// 안정성 설정: Windows에서 자동으로 오프라인 모드 권장
if (isWindows) {
  console.warn('[Firebase Config] Windows 환경 감지됨. 안정적인 사용을 위해 오프라인 모드를 권장합니다.');
  console.warn('[Firebase Config] 오프라인 모드 활성화는 localStorage.setItem("firebaseOfflineMode", "true")를 실행하세요.');
}

// 초기화 로직
let app;
let auth: Auth | null = null;

// Firebase 초기화 시도 (오프라인 모드가 아닐 때만)
if (!isOfflineMode()) {
  try {
    console.log('[Firebase Config] 초기화 시도...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('[Firebase Config] 초기화 성공');
    
    // 초기화 상태를 localStorage에 저장
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('firebase-initialized', 'true');
    }
  } catch (error) {
    console.error('[Firebase Config] 초기화 실패:', error);
    app = null;
    auth = null;
    
    // 초기화 실패 상태를 localStorage에 저장
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('firebase-initialized', 'false');
      
      // Windows에서 초기화 실패 시 자동으로 오프라인 모드 활성화
      if (isWindows) {
        console.warn('[Firebase Config] Windows에서 초기화 실패. 자동으로 오프라인 모드로 전환합니다.');
        localStorage.setItem('firebaseOfflineMode', 'true');
      }
    }
  }
} else {
  console.log('[Firebase Config] 오프라인 모드에서는 Firebase 초기화를 건너뜁니다.');
  app = null;
  auth = null;
  // 오프라인 모드에서는 초기화 성공으로 표시 (앱 작동에 필요)
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('firebase-initialized', 'true');
  }
}

// 오류 상태인 경우 대비 (윈도우 환경에서 발생할 수 있는 DOM 관련 오류 방지)
const safeAuth = () => {
  // 오프라인 모드 확인 (함수 호출 시점에 상태 확인)
  const offlineMode = isOfflineMode();
  
  // 오프라인 모드면 모의 객체 반환
  if (offlineMode) {
    console.log('[Firebase Config] 오프라인 모드에서 모의 Auth 객체 반환');
    return {
      currentUser: { uid: 'offline-user-id', displayName: 'Offline User' },
      signInWithPopup: async () => ({
        user: { uid: 'offline-user-id', displayName: 'Offline User' },
        credential: { accessToken: 'offline-mode-token' }
      }),
      signOut: async () => {}
    } as unknown as Auth;
  }
  
  if (!auth) {
    console.warn('[Firebase Config] auth 객체가 없음, 새로 생성 시도');
    try {
      // 재시도
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      console.log('[Firebase Config] auth 객체 재생성 성공');
      
      // 성공 상태 저장
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('firebase-initialized', 'true');
      }
    } catch (e) {
      console.error('[Firebase Config] auth 객체 재생성 실패:', e);
      
      // 실패 상태 저장
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('firebase-initialized', 'false');
        
        // Windows에서 초기화 실패 시 자동으로 오프라인 모드 활성화
        if (isWindows) {
          console.warn('[Firebase Config] Windows에서 재시도 실패. 자동으로 오프라인 모드로 전환합니다.');
          localStorage.setItem('firebaseOfflineMode', 'true');
        }
      }
      
      // 에러가 계속되면 모의 객체 반환
      return {
        currentUser: null,
        signInWithPopup: async () => {
          throw new Error('인증 시스템이 초기화되지 않았습니다.');
        }
      } as unknown as Auth;
    }
  }
  return auth;
};

export { app, auth, safeAuth }; 