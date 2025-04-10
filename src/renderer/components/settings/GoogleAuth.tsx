import { useState, useEffect } from 'react'
import { 
  signInWithGoogle, 
  signOutFromGoogle, 
  fetchGoogleSheetsList,
  getCurrentUser,
  GoogleToken,
  GoogleSheet
} from '../../../firebase/auth'

export const GoogleAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [token, setToken] = useState<GoogleToken | null>(null)
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [error, setError] = useState<string | null>(null)

  // 초기 로드 시 로그인 상태 확인
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // 로그인 상태 확인
  const checkAuthStatus = () => {
    const user = getCurrentUser()
    if (user) {
      setIsLoggedIn(true)
    }
  }

  // 구글 로그인 처리
  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Firebase 구글 로그인 실행
      const newToken = await signInWithGoogle()
      
      // 토큰 저장
      setToken(newToken)
      setIsLoggedIn(true)
      
      // 스프레드시트 목록 가져오기
      await loadSheetsList(newToken)
    } catch (error: any) {
      console.error('구글 로그인 실패:', error)
      setError(error.message || '구글 로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 구글 로그아웃
  const handleGoogleLogout = async () => {
    try {
      await signOutFromGoogle()
      setToken(null)
      setIsLoggedIn(false)
      setSheets([])
    } catch (error: any) {
      console.error('구글 로그아웃 실패:', error)
      setError(error.message || '구글 로그아웃 중 오류가 발생했습니다.')
    }
  }

  // 스프레드시트 목록 가져오기
  const loadSheetsList = async (authToken: GoogleToken) => {
    try {
      const sheetList = await fetchGoogleSheetsList(authToken)
      setSheets(sheetList)
    } catch (error: any) {
      console.error('스프레드시트 목록 가져오기 실패:', error)
      setError(error.message || '스프레드시트 목록을 가져오는 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <h2 className="text-lg font-semibold">구글 시트 연동</h2>
      
      {error && (
        <div className="p-2 mb-4 text-red-500 bg-red-100 rounded">
          {error}
        </div>
      )}
      
      {!isLoggedIn ? (
        <div className="flex flex-col gap-2">
          <p>구글 시트를 데이터 소스로 사용하려면 구글 계정에 로그인하세요.</p>
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? '로그인 중...' : '구글 계정으로 로그인'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-green-600">✓ 구글 계정 연결됨</p>
            <button
              onClick={handleGoogleLogout}
              className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
            >
              연결 해제
            </button>
          </div>
          
          {sheets.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">사용 가능한 스프레드시트</h3>
              <p className="text-sm text-gray-600">
                아래 목록에서 데이터 소스로 사용할 스프레드시트를 선택하세요.
              </p>
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-1">
                  {sheets.map((sheet) => (
                    <li key={sheet.id} className="p-2 border rounded hover:bg-gray-50">
                      <button className="w-full text-left" onClick={() => {}}>
                        {sheet.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 