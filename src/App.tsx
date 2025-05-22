import React, { useState, useEffect, useRef } from 'react'
import { MainLayout } from './renderer/components/layout/MainLayout'
import { OrderManagement } from './renderer/components/order/OrderManagement'
import { MenuManagement } from './renderer/components/menu/MenuManagement'
import { CategoryManagement } from './renderer/components/menu/CategoryManagement'
import { InventoryManagement } from './renderer/components/inventory/InventoryManagement'
import { OrderHistory } from './renderer/components/order/OrderHistory'
import { SettingsPage } from './renderer/components/settings/SettingsPage'
import { DataService, useGoogleSheetAutoSync, SyncStatus } from './firebase/dataService'
import { getCurrentUser, GoogleToken, checkRedirectResult } from './firebase/auth'
import { useAuth } from './firebase/AuthContext'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

// Windows 환경 감지
const isWindows = window.electron?.platform === 'win32';
console.log('Windows 환경 감지됨:', isWindows);

// 인증 콜백 처리 컴포넌트
const AuthCallback = () => {
  const [message, setMessage] = useState('인증 처리 중...');
  
  useEffect(() => {
    // URL에서 토큰 파라미터 추출
    const handleCallback = () => {
      try {
        const url = window.location.href;
        console.log('콜백 URL 수신:', url);
        
        // 해시 파라미터에서 토큰 추출
        if (url.includes('#access_token=')) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const expiresIn = hashParams.get('expires_in');
          
          if (accessToken) {
            // 토큰 저장
            const token = {
              accessToken,
              expirationTime: new Date().getTime() + (parseInt(expiresIn || '3600') * 1000)
            };
            
            localStorage.setItem('googleAuthToken', JSON.stringify(token));
            setMessage('인증이 완료되었습니다. 잠시 후 메인 페이지로 이동합니다...');
            
            // 메인 페이지로 리디렉션
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          } else {
            setMessage('인증 정보를 찾을 수 없습니다.');
          }
        } else {
          setMessage('유효한 인증 응답이 없습니다.');
        }
      } catch (error) {
        console.error('인증 콜백 처리 오류:', error);
        setMessage('인증 처리 중 오류가 발생했습니다.');
      }
    };
    
    handleCallback();
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Google 인증</h1>
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
};

type TabType = 'order' | 'menu' | 'category' | 'inventory' | 'history' | 'settings'

// AppContent - 메인 애플리케이션 컴포넌트
const AppContent = () => {
  const [activeTab, setActiveTab] = useState<TabType>('order')
  const [token, setToken] = useState<GoogleToken | null>(null)
  const [isLoginRequired, setIsLoginRequired] = useState(false)
  const [showSyncTooltip, setShowSyncTooltip] = useState(false)
  const [isRedirectChecking, setIsRedirectChecking] = useState(true)
  const tooltipTimerRef = useRef<number | null>(null)
  const { refreshToken } = useAuth();
  console.log('AppContent 렌더링 시작');
  
  // Firebase 인증 리디렉션 결과 확인
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        // Firebase 리디렉션 결과 확인
        console.log('Firebase 리디렉션 결과 확인 중...');
        const redirectResult = await checkRedirectResult();
        
        if (redirectResult) {
          console.log('Firebase 리디렉션 인증 성공, 토큰 설정');
          setToken(redirectResult);
          
          // 토큰 새로고침이 필요한 경우를 위해 useAuth에서 가져온 함수 사용
          await refreshToken();
        } else {
          console.log('리디렉션 결과 없음');
        }
      } catch (error) {
        console.error('리디렉션 결과 처리 오류:', error);
      } finally {
        setIsRedirectChecking(false);
      }
    };
    
    handleRedirectResult();
  }, [refreshToken]);
  
  // 앱 시작 시 로그인 및 연동 상태 확인
  useEffect(() => {
    // 리디렉션 체크가 끝날 때까지 기다림
    if (isRedirectChecking) {
      return;
    }
    
    const checkAuth = async () => {
      // 로컬스토리지에서 토큰 먼저 확인
      const storedToken = localStorage.getItem('googleAuthToken')
      if (storedToken) {
        try {
          const parsedToken = JSON.parse(storedToken)
          console.log('저장된 토큰 발견:', parsedToken.accessToken.substring(0, 10) + '...')
          setToken(parsedToken)
        } catch (e) {
          console.error('토큰 파싱 오류:', e)
          localStorage.removeItem('googleAuthToken')
        }
      }
      
      const { isLoggedIn, isSheetLinked } = DataService.checkLoginAndSyncStatus()
      console.log('로그인 상태:', { isLoggedIn, isSheetLinked })
      
      if (!isLoggedIn || !isSheetLinked) {
        // 로그인이나 시트 연동이 안되어 있으면 설정 페이지로 이동
        setActiveTab('settings')
        setIsLoginRequired(true)
      }
    }
    
    checkAuth()
  }, [isRedirectChecking])

  // 구글 시트 자동 동기화 훅 사용 (10초마다 동기화)
  const syncStatus = useGoogleSheetAutoSync(token, true)

  // 동기화 상태 변화 감지
  useEffect(() => {
    // 이전 타이머가 있다면 제거
    if (tooltipTimerRef.current !== null) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    
    if (syncStatus.lastSyncTime) {
      console.log('동기화 상태 업데이트:', {
        lastSync: syncStatus.lastSyncTime.toLocaleTimeString(),
        isSync: syncStatus.isSyncing,
        error: syncStatus.error
      })
      
      // 동기화가 완료됐을 때 툴팁 표시
      if (!syncStatus.isSyncing && !syncStatus.error) {
        setShowSyncTooltip(true);
        
        // 5초 후에 툴팁 숨기기
        tooltipTimerRef.current = window.setTimeout(() => {
          setShowSyncTooltip(false);
          tooltipTimerRef.current = null;
        }, 5000);
      } else if (syncStatus.error) {
        // 오류가 있으면 계속 표시
        setShowSyncTooltip(true);
      } else if (syncStatus.isSyncing) {
        // 동기화 중일 때도 표시
        setShowSyncTooltip(true);
      }
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (tooltipTimerRef.current !== null) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, [syncStatus.lastSyncTime, syncStatus.isSyncing, syncStatus.error]);
  
  // 동기화 상태 확인
  const renderSyncStatus = () => {
    if (!token || !showSyncTooltip) return null;
    
    return (
      <div 
        className={`text-sm p-2 rounded ${syncStatus.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} transition-opacity duration-300`}
      >
        {syncStatus.isSyncing ? (
          <span>데이터 동기화 중...</span>
        ) : syncStatus.error ? (
          <span>동기화 오류: {syncStatus.error}</span>
        ) : syncStatus.lastSyncTime ? (
          <span>마지막 동기화: {syncStatus.lastSyncTime.toLocaleTimeString()}</span>
        ) : (
          <span>동기화 대기 중...</span>
        )}
      </div>
    );
  };
  
  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {isLoginRequired && activeTab !== 'settings' && 
        <div className="p-4 mb-4 text-red-600 bg-red-100 rounded">
          구글 계정 로그인 및 스프레드시트 연동이 필요합니다. 설정 페이지로 이동하세요.
        </div>
      }
      {token && !isLoginRequired && renderSyncStatus()}
      {activeTab === 'order' && <OrderManagement />}
      {activeTab === 'menu' && <MenuManagement />}
      {activeTab === 'category' && <CategoryManagement />}
      {activeTab === 'inventory' && <InventoryManagement />}
      {activeTab === 'history' && <OrderHistory />}
      {activeTab === 'settings' && <SettingsPage onLoginComplete={() => setIsLoginRequired(false)} />}
    </MainLayout>
  );
};

// 메인 앱 컴포넌트 - 라우팅 설정
export default function App() {
  console.log('App 컴포넌트 렌더링 시작');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  try {
    return (
      <HashRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    );
  } catch (error) {
    console.error('App 렌더링 중 오류 발생:', error);
    setError(true);
    setErrorMessage(String(error));
    return null;
  }
}