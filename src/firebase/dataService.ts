import { SheetsService } from './sheets';
import { GoogleToken } from './auth';
import { useState, useEffect, useCallback, useRef } from 'react';

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
      // 메뉴 데이터 동기화
      const menuData = await this.loadData('menu');
      result.menu = await this.syncToGoogleSheet('menu', menuData, token);
      
      // 재고 데이터 동기화
      const inventoryData = await this.loadData('inventory');
      result.inventory = await this.syncToGoogleSheet('inventory', inventoryData, token);
      
      // 주문 데이터 동기화
      const ordersData = await this.loadData('orders');
      result.orders = await this.syncToGoogleSheet('orders', ordersData, token);
      
      // 쿠폰 데이터 동기화
      const couponsData = await this.loadData('coupons');
      result.coupons = await this.syncToGoogleSheet('coupons', couponsData, token);
      
      console.log('[DataService] 모든 데이터 동기화 결과:', result);
      return result;
    } catch (error) {
      console.error('[DataService] 데이터 동기화 중 오류 발생:', error);
      throw error;
    }
  },
  
  // 앱 초기화 시 로그인 및 연동 상태 검사
  checkLoginAndSyncStatus(): { isLoggedIn: boolean, isSheetLinked: boolean } {
    const isLoggedIn = !!localStorage.getItem('googleAuthToken');
    const isSheetLinked = this.isGoogleSheetLinked();
    
    return { isLoggedIn, isSheetLinked };
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