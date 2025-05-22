import { contextBridge, ipcRenderer } from 'electron'

// 전자 영수증 프린터 옵션 타입
interface ReceiptPrinterOptions {
  type?: string
  interface?: string
  width?: number
  ip?: string
  port?: number
  timeout?: number
  characterSet?: string
  driver?: any
  removeSpecialCharacters?: boolean
}

// API 타입 정의
interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data: any) => void
    sendSync: (channel: string, ...args: any[]) => any
    on: (channel: string, func: (...args: any[]) => void) => void
    once: (channel: string, func: (...args: any[]) => void) => void
    invoke: (channel: string, data?: any) => Promise<any>
  }
}

// 디버깅 로그 설정
const DEBUG = true;
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Preload]', ...args);
  }
};

// 오류 로그
const errorLog = (...args: any[]) => {
  console.error('[Preload Error]', ...args);
};

// Preload 시작 시간 기록
const startTime = new Date();
debugLog(`스크립트 실행 시작 (${startTime.toISOString()})`);

// 운영체제 확인
const platform = process.platform;
const isWindows = platform === 'win32';
debugLog(`운영체제: ${platform}, Windows: ${isWindows}`);

// Windows 환경에서 DOM 로드 감지 및 렌더링 도우미
if (isWindows) {
  debugLog('Windows 환경에 맞는 DOM 로드 감지 설정');
  
  // DOMContentLoaded 이벤트 감지
  window.addEventListener('DOMContentLoaded', () => {
    debugLog('DOMContentLoaded 이벤트 발생');
    
    // root 요소 확인
    const rootEl = document.getElementById('root');
    debugLog('root 요소 상태:', rootEl ? '존재함' : '존재하지 않음');
    
    // 디버깅을 위한 DOM 감시자 설정
    if (rootEl) {
      debugLog('root 요소 변화 감시 설정');
      const observer = new MutationObserver((mutations) => {
        debugLog('root 요소 변화 감지:', 
          `자식 요소 수: ${rootEl.childNodes.length}, 변화 수: ${mutations.length}`);
      });
      
      observer.observe(rootEl, { 
        childList: true,
        subtree: true 
      });
    }
  });
}

// 함수를 안전하게 컨텍스트 브릿지에 노출하는 헬퍼 함수
function safeExposeFunction(world: string, apiKey: string, api: any) {
  try {
    debugLog(`API 노출 시도: ${apiKey}`);
    contextBridge.exposeInMainWorld(world, api);
    debugLog(`API 노출 성공: ${apiKey}`);
  } catch (error) {
    errorLog(`API 노출 실패 (${apiKey}):`, error);
  }
}

// 모든 contextBridge 호출에 대한 일반 예외 처리
try {
  // Expose protected methods that allow the renderer process to use
  // Node.js functionality without exposing the entire API
  safeExposeFunction('electronAPI', 'electronAPI', {
    // Add any APIs you need to expose to the renderer process
    versions: process.versions,
    // Expose file system operations through IPC
    path: {
      join: (...args) => ipcRenderer.invoke('path:join', ...args),
      resolve: (...args) => ipcRenderer.invoke('path:resolve', ...args),
    },
    fs: {
      saveImage: (file: ArrayBuffer, menuId: string) => 
        ipcRenderer.invoke('fs:saveImage', file, menuId),
      deleteImage: (imageUrl: string) => 
        ipcRenderer.invoke('fs:deleteImage', imageUrl),
    },
    menu: {
      loadMenuFromJson: () => 
        ipcRenderer.invoke('menu:loadFromJson'),
      saveMenuToJson: (menuList: any) => 
        ipcRenderer.invoke('menu:saveToJson', menuList),
    },
    inventory: {
      loadInventoryFromJson: () => 
        ipcRenderer.invoke('inventory:loadFromJson'),
      saveInventoryToJson: (inventoryList: any) => 
        ipcRenderer.invoke('inventory:saveToJson', inventoryList),
    },
    orders: {
      loadOrdersFromJson: () => 
        ipcRenderer.invoke('orders:loadFromJson'),
      saveOrdersToJson: (orders: any) => 
        ipcRenderer.invoke('orders:saveToJson', orders),
    },
    coupon: {
      loadCouponsFromJson: () => 
        ipcRenderer.invoke('coupon:loadFromJson'),
      saveCouponsToJson: (coupons: any) => 
        ipcRenderer.invoke('coupon:saveToJson', coupons),
    },
    printer: {
      initialize: () => 
        ipcRenderer.invoke('printer:initialize'),
      getStatus: () => 
        ipcRenderer.invoke('printer:getStatus'),
      printOrder: (order: any) => 
        ipcRenderer.invoke('printer:printOrder', order),
    }
  });

  // Electron 환경 설정
  safeExposeFunction('electron', 'electron', {
    isElectron: true,
    platform: process.platform,
    isWindows: isWindows,
    fs: {
      readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
      writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', { filePath, content }),
      ensureDir: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath)
    },
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    // 기본 동작 추가
    ping: () => {
      debugLog('Ping 호출됨');
      return 'pong'; // 간단한 테스트 함수
    },
    getUserDataPath: () => {
      try {
        const path = ipcRenderer.sendSync('get-user-data-path');
        debugLog('사용자 데이터 경로:', path);
        return path;
      } catch (error) {
        errorLog('사용자 데이터 경로 가져오기 실패:', error);
        return 'error-getting-path';
      }
    },
    // Windows 환경에서 React 렌더링 문제 해결을 위한 헬퍼 함수
    checkRootElement: () => {
      const rootEl = document.getElementById('root');
      debugLog('root 요소 상태 확인 (API 호출):', 
        rootEl ? `존재함 (자식 요소 수: ${rootEl?.childNodes.length})` : '존재하지 않음');
      return {
        exists: !!rootEl,
        childCount: rootEl?.childNodes.length || 0,
        innerHTML: rootEl?.innerHTML || ''
      };
    },
    forceRerender: () => {
      debugLog('수동 리렌더링 시도');
      try {
        // 새로고침 대신 React 앱이 자체적으로 리렌더링할 수 있도록 함
        const rootEl = document.getElementById('root');
        if (rootEl) {
          debugLog('DOM 조작을 통한 리렌더링 시도');
          // 클래스를 통한 리렌더링 트리거 시도
          const currentClass = rootEl.className;
          rootEl.className = currentClass + ' force-rerender';
          setTimeout(() => {
            rootEl.className = currentClass;
          }, 10);
        }
        return true;
      } catch (error) {
        errorLog('수동 리렌더링 실패:', error);
        return false;
      }
    }
  });

  // IPC 통신용 API
  safeExposeFunction('electronIPC', 'electronIPC', {
    // 일반 IPC 통신
    send: (channel: string, data: any) => {
      debugLog(`IPC 전송: ${channel}`);
      ipcRenderer.send(channel, data);
    },
    
    // 동기 IPC 통신 (응답을 기다림)
    sendSync: (channel: string, ...args: any[]) => {
      debugLog(`동기 IPC 전송: ${channel}`);
      return ipcRenderer.sendSync(channel, ...args);
    },
    
    // 이벤트 리스너 등록
    on: (channel: string, func: (...args: any[]) => void) => {
      debugLog(`IPC 리스너 등록: ${channel}`);
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    
    // 일회용 이벤트 리스너 등록
    once: (channel: string, func: (...args: any[]) => void) => {
      debugLog(`일회용 IPC 리스너 등록: ${channel}`);
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
    
    // Promise 기반 통신 (응답을 기다림)
    invoke: (channel: string, data?: any) => {
      debugLog(`IPC Invoke 호출: ${channel}`);
      return ipcRenderer.invoke(channel, data);
    }
  });

  // 경로 관련 API
  safeExposeFunction('paths', 'paths', {
    join: (...args: string[]) => ipcRenderer.invoke('path:join', ...args),
    resolve: (...args: string[]) => ipcRenderer.invoke('path:resolve', ...args)
  });

  // 메뉴 데이터 API
  safeExposeFunction('menuData', 'menuData', {
    loadFromJson: async () => {
      debugLog('메뉴 데이터 로드 요청');
      return ipcRenderer.invoke('menu:loadFromJson');
    },
    
    saveToJson: async (menuList: any[]) => {
      debugLog('메뉴 데이터 저장 요청');
      return ipcRenderer.invoke('menu:saveToJson', menuList);
    }
  });

  // 재고 데이터 API
  safeExposeFunction('inventoryData', 'inventoryData', {
    loadFromJson: async () => {
      debugLog('재고 데이터 로드 요청');
      return ipcRenderer.invoke('inventory:loadFromJson');
    },
    
    saveToJson: async (inventoryList: any[]) => {
      debugLog('재고 데이터 저장 요청');
      return ipcRenderer.invoke('inventory:saveToJson', inventoryList);
    }
  });

  // 주문 데이터 API
  safeExposeFunction('orderData', 'orderData', {
    loadFromJson: async () => {
      debugLog('주문 데이터 로드 요청');
      return ipcRenderer.invoke('orders:loadFromJson');
    },
    
    saveToJson: async (orders: any[]) => {
      debugLog('주문 데이터 저장 요청');
      return ipcRenderer.invoke('orders:saveToJson', orders);
    }
  });

  // 선불권 데이터 API
  safeExposeFunction('couponData', 'couponData', {
    loadFromJson: async () => {
      debugLog('선불권 데이터 로드 요청');
      return ipcRenderer.invoke('coupon:loadFromJson');
    },
    
    saveToJson: async (coupons: any[]) => {
      debugLog('선불권 데이터 저장 요청');
      return ipcRenderer.invoke('coupon:saveToJson', coupons);
    }
  });

  // 프린터 API - Windows 환경에서 문제가 많이 발생하는 부분
  safeExposeFunction('printer', 'printer', {
    getAvailablePrinters: async () => {
      try {
        debugLog('사용 가능한 프린터 목록 요청');
        return ipcRenderer.invoke('printer:getAvailable');
      } catch (error) {
        errorLog('프린터 목록 요청 오류:', error);
        return [];
      }
    },
    
    savePrinterConfig: async (config: ReceiptPrinterOptions) => {
      try {
        debugLog('프린터 설정 저장 요청');
        return ipcRenderer.invoke('printer:saveConfig', config);
      } catch (error) {
        errorLog('프린터 설정 저장 오류:', error);
        return false;
      }
    },
    
    loadPrinterConfig: async () => {
      try {
        debugLog('프린터 설정 로드 요청');
        return ipcRenderer.invoke('printer:getConfig');
      } catch (error) {
        errorLog('프린터 설정 로드 오류:', error);
        return null;
      }
    },
    
    deletePrinterConfig: async () => {
      try {
        debugLog('프린터 설정 삭제 요청');
        return ipcRenderer.invoke('printer:deleteConfig');
      } catch (error) {
        errorLog('프린터 설정 삭제 오류:', error);
        return false;
      }
    },
    
    printReceipt: async (data: any, options: ReceiptPrinterOptions) => {
      try {
        debugLog('영수증 인쇄 요청');
        return ipcRenderer.invoke('printer:printReceipt', data, options);
      } catch (error) {
        errorLog('영수증 인쇄 오류:', error);
        return { success: false, error: error.message };
      }
    },
    
    closeDay: async (data: any, options: ReceiptPrinterOptions) => {
      try {
        debugLog('마감 영수증 인쇄 요청');
        return ipcRenderer.invoke('printer:closeDay', data, options);
      } catch (error) {
        errorLog('마감 영수증 인쇄 오류:', error);
        return { success: false, error: error.message };
      }
    }
  });

  // 실행 시간 계산
  const endTime = new Date();
  const executionTime = endTime.getTime() - startTime.getTime();
  debugLog(`스크립트 실행 완료 (소요 시간: ${executionTime}ms)`);

} catch (mainError) {
  // 치명적인 오류가 발생한 경우
  errorLog('Preload 스크립트 실행 중 치명적 오류:', mainError);
  
  // 최소한의 API는 노출시켜 문제 진단을 가능하게 함
  try {
    contextBridge.exposeInMainWorld('electronDebug', {
      isPreloadError: true,
      errorMessage: mainError.message,
      errorStack: mainError.stack,
      platform: process.platform,
      versions: process.versions
    });
  } catch (fallbackError) {
    console.error('디버그 API 노출 실패:', fallbackError);
  }
} 