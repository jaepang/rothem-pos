import React, { useState, useEffect, useRef } from 'react'
import { MainLayout } from './renderer/components/layout/MainLayout'
import { OrderManagement } from './renderer/components/order/OrderManagement'
import { MenuManagement } from './renderer/components/menu/MenuManagement'
import { CategoryManagement } from './renderer/components/menu/CategoryManagement'
import { InventoryManagement } from './renderer/components/inventory/InventoryManagement'
import { OrderHistory } from './renderer/components/order/OrderHistory'
import { SettingsPage } from './renderer/components/settings/SettingsPage'
import { DataService, useGoogleSheetAutoSync, SyncStatus } from './firebase/dataService'
import { getCurrentUser, GoogleToken } from './firebase/auth'

type TabType = 'order' | 'menu' | 'category' | 'inventory' | 'history' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('order')
  const [token, setToken] = useState<GoogleToken | null>(null)
  const [isLoginRequired, setIsLoginRequired] = useState(false)
  const [showSyncTooltip, setShowSyncTooltip] = useState(false)
  const tooltipTimerRef = useRef<number | null>(null)
  
  // 앱 시작 시 로그인 및 연동 상태 확인
  useEffect(() => {
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
  }, [])

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
  )
}