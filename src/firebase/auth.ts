import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
} from 'firebase/auth'
import { auth } from './config'

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
  const provider = new GoogleAuthProvider()
  
  // 필요한 스코프 추가
  provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly')
  provider.addScope('https://www.googleapis.com/auth/drive.readonly')
  
  return provider
}

// 구글 로그인 처리
export const signInWithGoogle = async (): Promise<GoogleToken> => {
  try {
    const provider = createGoogleProvider()
    const result = await signInWithPopup(auth, provider)
    
    // 구글 액세스 토큰 얻기
    const credential = GoogleAuthProvider.credentialFromResult(result)
    
    if (!credential) {
      throw new Error('로그인은 성공했지만 인증 정보를 가져오지 못했습니다.')
    }
    
    // 토큰 반환
    return {
      accessToken: credential.accessToken || '',
      refreshToken: result.user.refreshToken,
      expirationTime: new Date().getTime() + 3600 * 1000 // 대략 1시간 유효
    }
  } catch (error: any) {
    console.error('구글 로그인 실패:', error)
    throw new Error(error.message || '구글 로그인 중 오류가 발생했습니다.')
  }
}

// 로그아웃 처리
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    await signOut(auth)
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