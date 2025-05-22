import { initializeApp, getApp, getApps } from 'firebase/app'
import { 
  getAuth, 
  connectAuthEmulator, 
  browserLocalPersistence,
  browserSessionPersistence, 
  indexedDBLocalPersistence, 
  setPersistence, 
  inMemoryPersistence 
} from 'firebase/auth'

// Firebase 설정
// 이 정보는 민감하지 않고 클라이언트에 노출되어도 안전합니다
const firebaseConfig = {
  apiKey: "AIzaSyB3wQQGsRz2nkN6K3TQVoVI0GEwvJZNrLA",
  authDomain: "rothem-acd02.firebaseapp.com",
  projectId: "rothem-acd02",
  storageBucket: "rothem-acd02.firebasestorage.app",
  messagingSenderId: "141311538298",
  appId: "1:141311538298:web:24ed26bea75c46c4b6b7c3",
  measurementId: "G-9E9QEMZLBV",
}

// OAuth 설정 - Google Cloud Console에서 생성한 OAuth 클라이언트 ID
export const oauthConfig = {
  clientId: "833816109914-1f30uc04fco9cvp9daqh6rba82b8fjk4.apps.googleusercontent.com",
  redirectUri: "https://rothem-acd02.firebaseapp.com/__/auth/handler",
  // 브라우저 환경에서 직접 호출 가능한 URI 추가
  directRedirectUri: "https://rothem-acd02.web.app/auth-callback",
}

// Firebase 앱 초기화 전 설정 확인
console.log('Firebase 초기화 설정 확인:');
console.log('apiKey:', firebaseConfig.apiKey);
console.log('projectId:', firebaseConfig.projectId);
console.log('appId:', firebaseConfig.appId);

// 브라우저 스토리지 초기화 (선택적)
if (typeof window !== 'undefined') {
  try {
    // Firebase 관련 세션 스토리지 초기화
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.includes('firebase') || key.includes('firebaseLocalStorage')) {
        console.log('세션 스토리지 항목 삭제:', key);
        sessionStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('세션 스토리지 초기화 실패:', e);
  }
}

// Firebase 초기화 (이미 초기화된 앱이 있다면 재사용)
let firebaseApp;
if (getApps().length === 0) {
  console.log('Firebase 앱 초기화 중...');
  firebaseApp = initializeApp(firebaseConfig);
} else {
  console.log('기존 Firebase 앱 사용');
  firebaseApp = getApp();
}

// Firebase 인증 인스턴스 가져오기
export const auth = getAuth(firebaseApp);

// 개발 환경에서만 콘솔에 현재 인증 상태 로깅
if (import.meta.env.DEV) {
  auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
  });
}

// 브라우저 환경이 아닌 경우(Electron) 처리
if (typeof window !== 'undefined') {
  // 지속성 문제 처리를 위한 함수
  const setupPersistence = async () => {
    try {
      // 먼저 indexedDB 지속성 시도
      await setPersistence(auth, indexedDBLocalPersistence);
      console.log('IndexedDB 지속성으로 설정됨');
    } catch (indexedDBError) {
      console.warn('IndexedDB 지속성 설정 실패:', indexedDBError);
      
      try {
        // 대체 방법으로 browserLocal 시도
        await setPersistence(auth, browserLocalPersistence);
        console.log('브라우저 로컬 지속성으로 설정됨');
      } catch (localError) {
        console.warn('브라우저 로컬 지속성 설정 실패:', localError);
        
        try {
          // 마지막으로 세션 지속성 시도
          await setPersistence(auth, browserSessionPersistence);
          console.log('브라우저 세션 지속성으로 설정됨');
        } catch (sessionError) {
          console.error('모든 지속성 설정 실패:', sessionError);
          
          // 최후의 방법으로 인메모리 사용
          try {
            await setPersistence(auth, inMemoryPersistence);
            console.log('인메모리 지속성으로 설정됨');
          } catch (memoryError) {
            console.error('인메모리 지속성 설정도 실패:', memoryError);
          }
        }
      }
    }
  };
  
  // 지속성 설정 실행
  setupPersistence();

  // Electron 환경 감지 및 처리
  if (window.electron) {
    console.log('Electron 환경 감지됨, 특별 처리 적용');
  }
}

// Firebase 앱 내보내기
export const app = firebaseApp; 