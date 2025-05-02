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
import { auth, oauthConfig } from './config'

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

// 구글 제공자 생성 (스프레드시트 접근 권한 추가)
const createGoogleProvider = () => {
  console.log('[Firebase Auth] Google 인증 제공자 생성');
  const provider = new GoogleAuthProvider()
  
  // 필요한 스코프 추가 (쓰기 권한 포함)
  provider.addScope('https://www.googleapis.com/auth/drive')
  provider.addScope('https://www.googleapis.com/auth/spreadsheets')
  
  // 팝업 모드 선호
  provider.setCustomParameters({
    prompt: 'select_account',
    login_hint: 'user@example.com'
  });
  
  // 로깅 - 안전하게 타입 체크
  console.log('[Firebase Auth] Google 인증 제공자 설정됨');
  
  return provider
}

// 구글 로그인 처리 - 모든 환경에서 작동하는 개선된 버전
export const signInWithGoogle = async (): Promise<GoogleToken> => {
  try {
    console.log('[Firebase Auth] ========= 구글 로그인 시작 =========');
    const provider = createGoogleProvider();
    let credential;
    let result;
    
    // 환경 확인
    const isElectron = !!(window as any).electron;
    console.log(`[Firebase Auth] 실행 환경: ${isElectron ? 'Electron' : '웹 브라우저'}`);
    
    if (isElectron) {
      // Electron 환경에서는 내장 브라우저 창을 통한 인증 방식 사용
      console.log('[Firebase Auth] Electron 환경 감지, 내장 인증 방식 사용');
      
      // 1. OAuth URL 생성 - 올바른 클라이언트 ID 사용
      const googleAuthURL = `https://accounts.google.com/o/oauth2/auth?client_id=${oauthConfig.clientId}&response_type=token&scope=email%20profile%20https://www.googleapis.com/auth/drive%20https://www.googleapis.com/auth/spreadsheets&redirect_uri=${oauthConfig.redirectUri}`;
      
      console.log('[Firebase Auth] OAuth 인증 URL:', googleAuthURL);
      
      try {
        // window.electronIPC가 존재하는지 확인
        if (typeof (window as any).electronIPC !== 'undefined' && (window as any).electronIPC) {
          // Electron IPC를 통해 main 프로세스에 인증 요청
          console.log('[Firebase Auth] IPC를 통해 인증 요청 중...');
          
          // IPC를 통해 main 프로세스에 요청 보내기 (타입 안전을 위해 any 타입 사용)
          const electronAPI = (window as any).electronIPC;
          const result = await electronAPI.invoke('auth:google-oauth', googleAuthURL);
          
          console.log('[Firebase Auth] IPC 인증 성공, 결과 수신:', result);
          
          // 결과에서 토큰 추출
          const token = {
            accessToken: result.access_token || '',
            refreshToken: result.refresh_token || '',
            expirationTime: new Date().getTime() + (result.expires_in || 3600) * 1000
          };
          
          // 로컬 스토리지에 토큰 저장
          localStorage.setItem('googleAuthToken', JSON.stringify(token));
          console.log('[Firebase Auth] 인증 토큰 저장됨');
          
          return token;
        } else {
          throw new Error('Electron IPC가 설정되지 않았습니다.');
        }
      } catch (error) {
        console.error('[Firebase Auth] Electron 인증 실패:', error);
        throw error;
      }
    } else {
      // 웹 브라우저 환경에서는 다양한 인증 방식 시도
      console.log('[Firebase Auth] 웹 브라우저 환경 감지, 인증 프로세스 시작');
      
      // 세션 스토리지 확인 (문제 진단용)
      try {
        sessionStorage.setItem('firebase-auth-test', 'test');
        const testValue = sessionStorage.getItem('firebase-auth-test');
        sessionStorage.removeItem('firebase-auth-test');
        console.log('[Firebase Auth] 세션 스토리지 테스트 결과:', testValue === 'test' ? '정상' : '비정상');
      } catch(storageError) {
        console.error('[Firebase Auth] 세션 스토리지 접근 오류:', storageError);
      }
      
      // 방법 1: 표준 팝업 인증
      try {
        console.log('[Firebase Auth] 방법 1: 표준 팝업 인증 시도');
        
        // 커스텀 팝업 설정 - 직접 리디렉션 URI 사용
        provider.setCustomParameters({
          prompt: 'select_account',
          redirect_uri: oauthConfig.directRedirectUri
        });
        
        result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        console.log('[Firebase Auth] 팝업 인증 성공');
        
        // 구글 액세스 토큰 얻기
        credential = GoogleAuthProvider.credentialFromResult(result);
        
        if (!credential) {
          throw new Error('로그인은 성공했지만 인증 정보를 가져오지 못했습니다.');
        }
        
        // 토큰 생성
        const token = {
          accessToken: credential.accessToken || '',
          refreshToken: result.user.refreshToken,
          expirationTime: new Date().getTime() + 3600 * 1000 // 1시간 유효
        };
        
        // 로컬스토리지에 토큰 저장
        localStorage.setItem('googleAuthToken', JSON.stringify(token));
        console.log('[Firebase Auth] 인증 토큰 저장됨');
        
        return token;
      } catch (popupError) {
        console.error('[Firebase Auth] 팝업 인증 실패:', popupError);
        
        // 방법 2: 직접 구글 OAuth 시도
        try {
          console.log('[Firebase Auth] 방법 2: 직접 구글 OAuth 시도');
          
          // 직접 OAuth URL 생성
          const directOAuthURL = `https://accounts.google.com/o/oauth2/auth?client_id=${oauthConfig.clientId}&response_type=token&scope=email%20profile%20https://www.googleapis.com/auth/drive%20https://www.googleapis.com/auth/spreadsheets&redirect_uri=${encodeURIComponent(oauthConfig.directRedirectUri)}`;
          
          console.log('[Firebase Auth] 직접 OAuth URL:', directOAuthURL);
          
          // 새 창에서 OAuth 열기
          const authWindow = window.open(directOAuthURL, '_blank', 'width=600,height=600');
          
          if (!authWindow) {
            throw new Error('팝업 창을 열 수 없습니다. 팝업 차단을 해제해주세요.');
          }
          
          alert('구글 로그인 창이 열렸습니다. 로그인 후 이 창으로 돌아와주세요.');
          
          // 임시 토큰 생성
          const tempToken = {
            accessToken: 'temporary-token-pending-callback',
            expirationTime: new Date().getTime() + 60 * 1000 // 1분만 유효
          };
          
          return tempToken;
        } catch (directOAuthError) {
          console.error('[Firebase Auth] 직접 OAuth 시도 실패:', directOAuthError);
          
          // 방법 3: 최후의 수단 - 리디렉션
          try {
            console.log('[Firebase Auth] 방법 3: 리디렉션 인증 시도');
            
            const lastResortProvider = createGoogleProvider();
            lastResortProvider.setCustomParameters({
              prompt: 'consent',
              access_type: 'offline',
              include_granted_scopes: 'true'
            });
            
            alert('다른 인증 방법이 실패했습니다. 리디렉션 방식으로 시도합니다. 로그인 후 이 페이지로 자동으로 돌아옵니다.');
            await signInWithRedirect(auth, lastResortProvider);
            return { accessToken: 'redirect_pending' };
          } catch (redirectError) {
            console.error('[Firebase Auth] 리디렉션 인증도 실패:', redirectError);
            throw new Error('모든 인증 방법이 실패했습니다.');
          }
        }
      }
    }
  } catch (error: any) {
    console.error('[Firebase Auth] 구글 로그인 실패 (최종):', error);
    throw new Error(error.message || '구글 로그인 중 오류가 발생했습니다.');
  }
};

// 페이지 리디렉션 후 결과 확인
export const checkRedirectResult = async (): Promise<GoogleToken | null> => {
  try {
    console.log('리디렉션 결과 확인 중...');
    const result = await getRedirectResult(auth);
    
    if (!result) {
      console.log('리디렉션 결과 없음');
      return null;
    }
    
    console.log('리디렉션 인증 성공');
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential) {
      throw new Error('인증 정보를 가져오지 못했습니다.');
    }
    
    const token = {
      accessToken: credential.accessToken || '',
      refreshToken: result.user.refreshToken,
      expirationTime: new Date().getTime() + 3600 * 1000
    };
    
    localStorage.setItem('googleAuthToken', JSON.stringify(token));
    return token;
  } catch (error) {
    console.error('리디렉션 결과 처리 실패:', error);
    return null;
  }
}

// 로그아웃 처리
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    await signOut(auth)
    // 로그아웃 시 로컬 스토리지에서 토큰 삭제
    localStorage.removeItem('googleAuthToken');
  } catch (error) {
    console.error('로그아웃 실패:', error)
    throw error
  }
}

// 시트 목록 가져오기
export const fetchGoogleSheetsList = async (token: GoogleToken): Promise<GoogleSheet[]> => {
  try {
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
    throw error;
  }
}

// 현재 로그인 상태 확인
export const getCurrentUser = () => {
  return auth.currentUser
} 