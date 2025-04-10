import { useState, useEffect } from 'react'
import { 
  signInWithGoogle, 
  signOutFromGoogle, 
  fetchGoogleSheetsList,
  getCurrentUser,
  GoogleToken,
  GoogleSheet
} from '../../../firebase/auth'
import { GoogleSheetSync } from './GoogleSheetSync'

export const GoogleAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSheets, setLoadingSheets] = useState(false)
  const [token, setToken] = useState<GoogleToken | null>(null)
  const [sheets, setSheets] = useState<GoogleSheet[]>([])
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 초기 로드 시 로그인 상태 확인
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // 로그인 상태 확인
  const checkAuthStatus = async () => {
    const user = getCurrentUser()
    if (user) {
      setIsLoggedIn(true)
      try {
        // 로그인 상태가 유지되고 있을 때 필요한 토큰 가져오기
        const newToken = await signInWithGoogle()
        setToken(newToken)
      } catch (error) {
        console.error('토큰 가져오기 실패:', error)
      }
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
      setSelectedSheet(null)
    } catch (error: any) {
      console.error('구글 로그아웃 실패:', error)
      setError(error.message || '구글 로그아웃 중 오류가 발생했습니다.')
    }
  }

  // 스프레드시트 목록 가져오기
  const loadSheetsList = async (authToken: GoogleToken) => {
    setLoadingSheets(true)
    setError(null)
    
    try {
      const sheetList = await fetchGoogleSheetsList(authToken)
      setSheets(sheetList)
      
      // 저장된 시트 ID가 있으면 선택
      const savedSheetId = localStorage.getItem('syncedSheetId')
      if (savedSheetId) {
        const savedSheet = sheetList.find(sheet => sheet.id === savedSheetId)
        if (savedSheet) {
          setSelectedSheet(savedSheet)
        }
      }
    } catch (error: any) {
      console.error('스프레드시트 목록 가져오기 실패:', error)
      setError(error.message || '스프레드시트 목록을 가져오는 중 오류가 발생했습니다.')
    } finally {
      setLoadingSheets(false)
    }
  }
  
  // 현재 토큰으로 시트 목록 새로고침
  const handleRefreshSheets = async () => {
    if (!token) {
      setError('로그인 상태가 아닙니다. 다시 로그인해주세요.')
      return
    }
    
    await loadSheetsList(token)
  }
  
  // 스프레드시트 선택 핸들러
  const handleSelectSheet = (sheet: GoogleSheet) => {
    setSelectedSheet(sheet)
  }
  
  // 연동 완료 핸들러
  const handleSyncComplete = (success: boolean) => {
    if (success) {
      // 필요한 추가 작업
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
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">사용 가능한 스프레드시트</h3>
              <button 
                onClick={handleRefreshSheets}
                disabled={loadingSheets}
                className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loadingSheets ? '로딩 중...' : '시트 목록 새로고침'}
              </button>
            </div>
            
            {sheets.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-1">
                  {sheets.map((sheet) => (
                    <li 
                      key={sheet.id} 
                      className={`p-2 border rounded hover:bg-gray-50 cursor-pointer ${
                        selectedSheet?.id === sheet.id ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                      onClick={() => handleSelectSheet(sheet)}
                    >
                      {sheet.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 text-sm text-gray-600 bg-gray-100 rounded">
                {loadingSheets 
                  ? '시트 목록을 가져오는 중...' 
                  : '시트 목록이 없습니다. 새로고침 버튼을 클릭하여 시트 목록을 가져오세요.'}
              </div>
            )}
          </div>
          
          {/* 선택한 시트가 있을 때 연동 컴포넌트 표시 */}
          {selectedSheet && token && (
            <GoogleSheetSync 
              token={token} 
              selectedSheet={selectedSheet}
              onSync={handleSyncComplete}
            />
          )}
        </div>
      )}
    </div>
  )
} 