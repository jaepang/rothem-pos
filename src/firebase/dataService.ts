import { SheetsService } from './sheets';
import { GoogleToken } from './auth';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser } from './auth';
// app를 사용하지 않도록 수정
// import { app } from './config';

// 앱 데이터 타입
export type DataType = 'menu' | 'inventory' | 'orders' | 'coupons';

// 자동 동기화 상태
export interface SyncStatus {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  error: string | null;
}

// 데이터 소스 관리 서비스
export const DataService = {
  // 구글 시트 연동 상태 확인
  isGoogleSheetLinked(): boolean {
    const sheetId = localStorage.getItem('syncedSheetId');
    return !!sheetId;
  },
  
  // 연동된 구글 시트 정보 가져오기
  getLinkedSheetInfo() {
    const sheetId = localStorage.getItem('syncedSheetId');
    const sheetName = localStorage.getItem('syncedSheetName');
    
    if (sheetId && sheetName) {
      return { id: sheetId, name: sheetName };
    }
    return null;
  },
  
  // 데이터 로드 (구글 시트 또는 JSON)
  async loadData(type: DataType, token?: GoogleToken): Promise<any[]> {
    console.log(`[DataService] ${type} 데이터 로드 시작`);
    
    // JSON에서 로드 (폴링 방식에서는 항상 로컬 JSON을 기준으로 함)
    console.log(`[DataService] JSON 파일에서 ${type} 데이터 로드`);
    try {
      let data: any[] = [];
      
      switch (type) {
        case 'menu':
          data = await window.electronAPI.menu.loadMenuFromJson();
          break;
        case 'inventory':
          data = await window.electronAPI.inventory.loadInventoryFromJson();
          break;
        case 'orders':
          data = await window.electronAPI.orders.loadOrdersFromJson();
          break;
        case 'coupons':
          data = await window.electronAPI.coupon.loadCouponsFromJson();
          break;
      }
      
      console.log(`[DataService] JSON 파일에서 ${type} 데이터 ${data.length}개 로드 완료`);
      return data;
    } catch (jsonError) {
      console.error(`[DataService] JSON 파일에서 ${type} 데이터 로드 실패:`, jsonError);
      return [];
    }
  },
  
  // 데이터 저장 (항상 JSON에 저장하고, 구글 시트는 폴링 방식으로 별도 동기화)
  async saveData(type: DataType, data: any[]): Promise<boolean> {
    console.log(`[DataService] ${type} 데이터 저장 시작 (${data.length}개 항목)`);
    
    // JSON 파일에 항상 저장
    try {
      console.log(`[DataService] JSON 파일에 ${type} 데이터 저장`);
      switch (type) {
        case 'menu':
          await window.electronAPI.menu.saveMenuToJson(data);
          break;
        case 'inventory':
          await window.electronAPI.inventory.saveInventoryToJson(data);
          break;
        case 'orders':
          await window.electronAPI.orders.saveOrdersToJson(data);
          break;
        case 'coupons':
          await window.electronAPI.coupon.saveCouponsToJson(data);
          break;
      }
      console.log(`[DataService] JSON 파일에 ${type} 데이터 저장 완료`);
      return true;
    } catch (jsonError) {
      console.error(`[DataService] JSON 파일에 ${type} 데이터 저장 실패:`, jsonError);
      return false;
    }
  },

  // 구글 시트에 데이터 동기화 (폴링에서 사용)
  async syncToGoogleSheet(type: DataType, data: any[], token: GoogleToken): Promise<boolean> {
    // 구글 시트 연동 확인
    const isLinked = this.isGoogleSheetLinked();
    const sheetInfo = this.getLinkedSheetInfo();
    
    if (!isLinked || !sheetInfo || !token) {
      console.log(`[DataService] 구글 시트 연동 상태 아님. 동기화 건너뜀`);
      return false;
    }
    
    try {
      console.log(`[DataService] 구글 시트에 ${type} 데이터 동기화 시작`);
      
      // 디버깅: 쿠폰 데이터의 경우 balance 필드 확인
      if (type === 'coupons') {
        console.log(`[DataService] 쿠폰 데이터 동기화 검사 - 총 ${data.length}개 항목`);
        data.forEach((coupon, index) => {
          console.log(`[DataService] 쿠폰 #${index+1} - ID: ${coupon.id}, 이름: ${coupon.code}, 잔액: ${coupon.balance}, 초기금액: ${coupon.amount}`);
          if (coupon.balance === undefined || coupon.balance === null) {
            console.warn(`[DataService] 경고: 쿠폰 #${index+1}의 balance 필드가 누락됨`);
            // balance 필드가 없으면 amount 값으로 설정
            console.log(`[DataService] balance 필드 자동 추가 (amount 값으로 설정): ${coupon.amount}`);
            data[index].balance = coupon.amount;
          }
        });
      }
      
      await SheetsService.updateSheetData(token, sheetInfo.id, type, data);
      console.log(`[DataService] 구글 시트에 ${type} 데이터 동기화 완료`);
      return true;
    } catch (error) {
      console.error(`[DataService] 구글 시트에 ${type} 데이터 동기화 실패:`, error);
      
      if (error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('403') ||
        error.message.includes('인증')
      )) {
        throw new Error(`인증 만료: 다시 로그인이 필요합니다.`);
      }
      
      return false;
    }
  },

  // 모든 데이터 타입 동기화
  async syncAllData(token: GoogleToken): Promise<{[key in DataType]: boolean}> {
    console.log('[DataService] 모든 데이터 동기화 시작');
    const result = {
      menu: false,
      inventory: false,
      orders: false,
      coupons: false
    };
    
    try {
      const isLinked = this.isGoogleSheetLinked();
      const sheetInfo = this.getLinkedSheetInfo();
      
      if (!isLinked || !sheetInfo || !token) {
        console.log(`[DataService] 구글 시트 연동 상태 아님. 동기화 건너뜀`);
        return result;
      }

      // 각 데이터 타입 처리
      for (const type of ['menu', 'inventory', 'orders', 'coupons'] as DataType[]) {
        try {
          // 1. JSON 파일에서 데이터 로드 시도
          let localData = await this.loadData(type);
          
          // 2. JSON 파일이 비어있는 경우 (파일이 없거나 빈 배열인 경우)
          if (!localData || localData.length === 0) {
            console.log(`[DataService] ${type} JSON 파일이 없거나 비어있습니다. 구글 시트에서 데이터를 가져옵니다.`);
            
            try {
              // 구글 시트에서 데이터 가져오기
              const sheetData = await SheetsService.loadSheetData(token, sheetInfo.id, type);
              
              if (sheetData && sheetData.length > 0) {
                console.log(`[DataService] 구글 시트에서 ${type} 데이터 ${sheetData.length}개 항목 로드 성공`);
                
                // 가져온 데이터를 JSON 파일로 저장
                await this.saveData(type, sheetData);
                console.log(`[DataService] 구글 시트의 ${type} 데이터를 JSON 파일로 저장 완료`);
                
                // 로컬 데이터 업데이트
                localData = sheetData;
                result[type] = true;
              } else {
                console.log(`[DataService] 구글 시트에 ${type} 데이터가 없습니다.`);
              }
            } catch (sheetError) {
              console.error(`[DataService] 구글 시트에서 ${type} 데이터 가져오기 실패:`, sheetError);
            }
          } else {
            // 3. JSON 파일에 데이터가 있는 경우, 구글 시트에 동기화
            console.log(`[DataService] JSON 파일의 ${type} 데이터를 구글 시트에 동기화합니다.`);
            result[type] = await this.syncToGoogleSheet(type, localData, token);
          }
        } catch (typeError) {
          console.error(`[DataService] ${type} 데이터 처리 중 오류 발생:`, typeError);
          result[type] = false;
        }
      }
      
      console.log('[DataService] 모든 데이터 동기화 결과:', result);
      return result;
    } catch (error) {
      console.error('[DataService] 데이터 동기화 중 오류 발생:', error);
      throw error;
    }
  },
  
  // 로그인 및 동기화 상태 확인 메서드 개선
  checkLoginAndSyncStatus(): { isLoggedIn: boolean; isSheetLinked: boolean } {
    try {
      // Firebase 초기화 실패 시 오프라인 모드로 전환
      if (!checkFirebaseInitialization()) {
        console.warn('[DataService] Firebase 초기화 실패, 오프라인 모드로 전환');
        setupOfflineMode(true);
        return { isLoggedIn: true, isSheetLinked: true };  // 오프라인 모드에서는 항상 true 반환
      }
      
      if (isOfflineMode()) {
        console.log('[DataService] 오프라인 모드 - 로그인/연동 상태 무시');
        return { isLoggedIn: true, isSheetLinked: true };
      }
      
      const user = getCurrentUser();
      const storedToken = localStorage.getItem('googleAuthToken');
      const spreadsheetId = localStorage.getItem('googleSpreadsheetId');
      
      console.log('[DataService] 로그인 상태:', !!user);
      console.log('[DataService] 스프레드시트 연동 상태:', !!spreadsheetId);
      
      return {
        isLoggedIn: !!user && !!storedToken,
        isSheetLinked: !!spreadsheetId
      };
    } catch (error) {
      console.error('[DataService] 상태 확인 중 오류:', error);
      return { isLoggedIn: false, isSheetLinked: false };
    }
  }
};

// 구글 시트 자동 동기화 훅
export function useGoogleSheetAutoSync(
  token: GoogleToken | null, 
  enabled: boolean = true,
  interval: number = 60000 // 기본 1분 간격, 필요시 변경 가능
): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    isSyncing: false,
    error: null
  });
  
  // isSyncing 상태를 ref로 관리하여 의존성 문제 해결
  const isSyncingRef = useRef(false);
  
  // 상태 변경 시 ref도 함께 업데이트
  useEffect(() => {
    isSyncingRef.current = status.isSyncing;
  }, [status.isSyncing]);
  
  // syncData 함수를 useCallback으로 분리하여 의존성 관리
  const syncData = useCallback(async () => {
    // 토큰이 없거나 이미 동기화 중이면 실행하지 않음
    if (!token || isSyncingRef.current) {
      console.log(`[AutoSync] 동기화 건너뜀: ${!token ? '토큰 없음' : '이미 동기화 중'}`);
      return;
    }
    
    try {
      console.log('[AutoSync] 데이터 동기화 시작...', new Date().toLocaleTimeString());
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
      // ref 값도 업데이트
      isSyncingRef.current = true;
      
      const result = await DataService.syncAllData(token);
      const successCount = Object.values(result).filter(Boolean).length;
      const timestamp = new Date();
      
      setStatus(prev => ({ 
        ...prev, 
        lastSyncTime: timestamp,
        isSyncing: false
      }));
      // ref 값도 업데이트
      isSyncingRef.current = false;
      
      console.log(`[AutoSync] 동기화 완료 (${successCount}/4 성공) - ${timestamp.toLocaleTimeString()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[AutoSync] 동기화 오류:', errorMessage);
      
      setStatus(prev => ({ 
        ...prev, 
        isSyncing: false,
        error: errorMessage
      }));
      // ref 값도 업데이트
      isSyncingRef.current = false;
      
      // 인증 오류인 경우 특별 처리
      if (errorMessage.includes('인증') || 
          errorMessage.includes('401') || 
          errorMessage.includes('403')) {
        console.error('[AutoSync] 인증 오류가 발생했습니다. 재로그인이 필요합니다.');
      }
    }
  }, [token]); // status.isSyncing 의존성 제거하고 ref로 대체
  
  useEffect(() => {
    // 활성화 상태 로그 출력
    if (!enabled) {
      console.log('[AutoSync] 사용자 설정으로 동기화가 비활성화되었습니다.');
      return;
    }
    
    if (!token) {
      console.log('[AutoSync] 토큰이 없어 동기화가 비활성화되었습니다.');
      return;
    }
    
    console.log(`[AutoSync] 구글 시트 자동 동기화가 활성화되었습니다. (${interval/1000}초 간격)`, token);
    
    // 페이지 로드 시 첫 동기화 (1초 후 시작)
    const initialSyncTimeout = setTimeout(() => {
      console.log('[AutoSync] 초기 동기화 시작...');
      syncData();
    }, 1000);
    
    // 설정된 간격마다 동기화 실행
    console.log(`[AutoSync] ${interval/1000}초 간격 타이머 설정됨`);
    const intervalId = setInterval(syncData, interval);
    
    return () => {
      clearTimeout(initialSyncTimeout);
      clearInterval(intervalId);
      console.log('[AutoSync] 동기화 정지');
    };
  }, [token, enabled, interval, syncData]);
  
  return status;
}

// Firebase 초기화 상태를 확인하고 실패시 안전하게 대체 기능을 제공하는 추가 코드
export const checkFirebaseInitialization = (): boolean => {
  try {
    // Firebase 초기화 여부 직접 체크
    const isFirebaseInitialized = typeof window !== 'undefined' && 
                                 window.localStorage && 
                                 localStorage.getItem('firebase-initialized') === 'true';
    
    if (!isFirebaseInitialized) {
      console.warn('[DataService] Firebase가 초기화되지 않았거나 사용할 수 없습니다.');
    }
    
    return isFirebaseInitialized;
  } catch (error) {
    console.error('[DataService] Firebase 초기화 확인 중 오류:', error);
    return false;
  }
};

// 앱이 Firebase와 독립적으로 실행될 수 있도록 하는 함수
export const setupOfflineMode = (enable: boolean = false): void => {
  console.log(`[Firebase] 오프라인 모드 ${enable ? '활성화' : '비활성화'}`);
  
  // localStorage에 오프라인 모드 상태 저장
  localStorage.setItem('firebaseOfflineMode', enable ? 'true' : 'false');
};

// 오프라인 모드 상태 확인
export const isOfflineMode = (): boolean => {
  return localStorage.getItem('firebaseOfflineMode') === 'true';
}; 