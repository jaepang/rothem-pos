import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as fs } from 'node:fs'
import fs_sync from 'node:fs'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'
import { URL } from 'node:url'
import { release } from 'node:os'
import { net } from 'electron'
const usb = require('usb')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// IPC Handlers
ipcMain.handle('path:join', (_, ...args) => path.join(...args))
ipcMain.handle('path:resolve', (_, ...args) => path.resolve(...args))

// 사용자 데이터 경로 가져오기
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData')
})

const IMAGES_BASE_DIR = app.isPackaged 
  ? path.join(app.getPath('userData'), 'images')
  : path.join(process.cwd(), 'public', 'images')
  
const IMAGE_DIR = path.join(IMAGES_BASE_DIR, 'menu')

// File system handlers
ipcMain.handle('fs:saveImage', async (_, buffer: ArrayBuffer, menuId: string) => {
  try {
    // 이미지 디렉토리가 없으면 생성
    if (!fs_sync.existsSync(IMAGE_DIR)) {
      await fs.mkdir(IMAGE_DIR, { recursive: true })
    }

    const fileName = `${menuId}.jpg`
    const filePath = path.join(IMAGE_DIR, fileName)
    
    // 파일 저장
    await fs.writeFile(filePath, Buffer.from(buffer))
    
    // 이미지 경로 반환
    const imagePath = app.isPackaged
      ? `app-image://menu/${fileName}` // 패키지된 앱에서의 프로토콜 경로
      : `/images/menu/${fileName}` // 개발 환경에서의 상대 경로
      
    return imagePath
  } catch (error) {
    console.error('이미지 저장 실패:', error)
    throw error
  }
})

ipcMain.handle('fs:deleteImage', async (_, imageUrl: string) => {
  try {
    const fileName = imageUrl.split('/').pop()
    if (!fileName) return

    const filePath = path.join(IMAGE_DIR, fileName)
    if (fs_sync.existsSync(filePath)) {
      await fs.unlink(filePath)
    }
  } catch (error) {
    console.error('이미지 삭제 실패:', error)
    throw error
  }
})

// 경로 설정
const DATA_DIR = path.join(app.getPath('userData'), 'data')
const MENU_FILE_PATH = path.join(DATA_DIR, 'menu.json')
const INVENTORY_FILE_PATH = path.join(DATA_DIR, 'inventory.json')
const ORDERS_FILE_PATH = path.join(DATA_DIR, 'orders.json')
const COUPONS_FILE_PATH = path.join(DATA_DIR, 'coupons.json')

// IPC 핸들러 등록
ipcMain.handle('menu:loadFromJson', async () => {
  try {
    if (!fs_sync.existsSync(MENU_FILE_PATH)) {
      // 메뉴 파일이 없으면 빈 배열 생성 후 반환
      await fs.writeFile(MENU_FILE_PATH, JSON.stringify([], null, 2))
      return []
    }
    const data = await fs.readFile(MENU_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('메뉴 데이터 로드 실패:', error)
    throw error
  }
})

ipcMain.handle('menu:saveToJson', async (_, menuList) => {
  try {
    const dirPath = path.dirname(MENU_FILE_PATH)
    if (!fs_sync.existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true })
    }
    await fs.writeFile(MENU_FILE_PATH, JSON.stringify(menuList, null, 2))
  } catch (error) {
    console.error('메뉴 데이터 저장 실패:', error)
    throw error
  }
})

// 재고 IPC 핸들러
ipcMain.handle('inventory:loadFromJson', async () => {
  try {
    if (!fs_sync.existsSync(INVENTORY_FILE_PATH)) {
      return []
    }
    const data = await fs.readFile(INVENTORY_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('재고 데이터 로드 실패:', error)
    throw error
  }
})

ipcMain.handle('inventory:saveToJson', async (_, inventoryList) => {
  try {
    const dirPath = path.dirname(INVENTORY_FILE_PATH)
    if (!fs_sync.existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true })
    }
    await fs.writeFile(INVENTORY_FILE_PATH, JSON.stringify(inventoryList, null, 2))
  } catch (error) {
    console.error('재고 데이터 저장 실패:', error)
    throw error
  }
})

// 주문 관련 IPC 핸들러
ipcMain.handle('orders:loadFromJson', async () => {
  try {
    if (!fs_sync.existsSync(ORDERS_FILE_PATH)) {
      // 주문 파일이 존재하지 않으면 빈 배열 반환
      await fs.writeFile(ORDERS_FILE_PATH, JSON.stringify([], null, 2))
      return []
    }
    const data = await fs.readFile(ORDERS_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('주문 데이터 로드 실패:', error)
    return []
  }
})

ipcMain.handle('orders:saveToJson', async (_, orders) => {
  try {
    const dirPath = path.dirname(ORDERS_FILE_PATH)
    if (!fs_sync.existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true })
    }
    await fs.writeFile(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2))
    return true
  } catch (error) {
    console.error('주문 데이터 저장 실패:', error)
    return false
  }
})

// 선불권 관련 IPC 핸들러
ipcMain.handle('coupon:loadFromJson', async () => {
  try {
    if (!fs_sync.existsSync(COUPONS_FILE_PATH)) {
      // 선불권 파일이 존재하지 않으면 빈 배열 반환
      await fs.writeFile(COUPONS_FILE_PATH, JSON.stringify([], null, 2))
      return []
    }
    const data = await fs.readFile(COUPONS_FILE_PATH, 'utf-8')
    const coupons = JSON.parse(data)
    
    // balance 필드 검증 및 보완
    const validatedCoupons = coupons.map((coupon: any) => {
      // balance가 없거나 null이면 amount로 설정
      if (coupon.balance === undefined || coupon.balance === null) {
        console.log(`[Electron] 선불권 ID: ${coupon.id}, 이름: ${coupon.code}의 balance 필드 누락, amount(${coupon.amount})로 설정`)
        return {
          ...coupon,
          balance: coupon.amount
        }
      }
      return coupon
    })
    
    // 변경된 내용이 있으면 파일에 다시 저장
    if (JSON.stringify(coupons) !== JSON.stringify(validatedCoupons)) {
      console.log('[Electron] 선불권 데이터 balance 필드 보완 후 저장')
      await fs.writeFile(COUPONS_FILE_PATH, JSON.stringify(validatedCoupons, null, 2))
    }
    
    return validatedCoupons
  } catch (error) {
    console.error('선불권 데이터 로드 실패:', error)
    return []
  }
})

ipcMain.handle('coupon:saveToJson', async (_, coupons) => {
  try {
    const dirPath = path.dirname(COUPONS_FILE_PATH)
    if (!fs_sync.existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true })
    }

    // balance 필드 검증 및 보완
    const validatedCoupons = coupons.map((coupon: any) => {
      // balance가 없거나 null이면 amount로 설정
      if (coupon.balance === undefined || coupon.balance === null) {
        console.log(`[Electron] 저장 과정: 선불권 ID: ${coupon.id}, 이름: ${coupon.code}의 balance 필드 누락, amount(${coupon.amount})로 자동 설정`)
        return {
          ...coupon,
          balance: coupon.amount
        }
      }
      return coupon
    })

    await fs.writeFile(COUPONS_FILE_PATH, JSON.stringify(validatedCoupons, null, 2))
    return true
  } catch (error) {
    console.error('선불권 데이터 저장 실패:', error)
    return false
  }
})

// 프린터 설정 및 USB 관련 변수
const EPSON_VENDOR_ID = 0x04b8 // Seiko Epson Corp.
const EPSON_PRODUCT_ID = 0x0e27 // TM-T83III
let printer: ThermalPrinter | null = null
let usbDevice: any = null

// 프린터 IPC 핸들러
ipcMain.handle('printer:initialize', async () => {
  try {
    // USB 장치 찾기
    usbDevice = usb.findByIds(EPSON_VENDOR_ID, EPSON_PRODUCT_ID)
    
    if (!usbDevice) {
      console.error('프린터 USB 장치를 찾을 수 없습니다')
      return false
    }
    
    // 프린터 초기화
    printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'usb',
    })
    
    console.log('프린터 USB 장치 발견:', EPSON_VENDOR_ID.toString(16), EPSON_PRODUCT_ID.toString(16))
    return true
  } catch (error) {
    console.error('프린터 초기화 실패:', error)
    printer = null
    usbDevice = null
    return false
  }
})

ipcMain.handle('printer:getStatus', async () => {
  if (!printer || !usbDevice) {
    return false
  }
  
  try {
    // USB 장치가 연결되어 있는지 확인
    return usbDevice !== null
  } catch (error) {
    console.error('프린터 상태 확인 실패:', error)
    return false
  }
})

ipcMain.handle('printer:printOrder', async (_, order: any) => {
  if (!usbDevice) {
    throw new Error('프린터가 연결되어 있지 않습니다')
  }

  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'usb',
    })

    // 헤더 출력
    printer.alignCenter()
    printer.bold(true)
    printer.setTextSize(1, 1)
    printer.println('주문서')
    printer.println('===================')
    printer.bold(false)
    printer.alignLeft()

    // 주문 정보 출력
    printer.println(`주문번호: ${order.id.split('-')[3] || order.id}`)
    printer.println(`주문시간: ${new Date(order.orderDate).toLocaleString()}`)
    printer.println('-------------------')

    // 주문 항목 출력
    order.items.forEach((item: any) => {
      printer.println(`${item.menuItem.name} x ${item.quantity}`)
      printer.alignRight()
      printer.println(`${(item.menuItem.price * item.quantity).toLocaleString()}원`)
      printer.alignLeft()
    })

    // 합계 출력
    printer.println('===================')
    printer.bold(true)
    printer.println('합계')
    printer.alignRight()
    printer.println(`${order.totalAmount.toLocaleString()}원`)
    printer.alignLeft()
    printer.bold(false)

    // 메모 출력
    if (order.memo) {
      printer.println('-------------------')
      printer.println('메모:')
      printer.println(order.memo)
    }

    // 푸터 출력
    printer.println('\n\n')
    
    // 용지 절단 명령 추가
    printer.partialCut(); // 부분 절단 (용지가 약간 연결된 상태로 남음)
    
    // USB 장치로 데이터 전송
    usbDevice.open()
    
    try {
      const usbInterface = usbDevice.interfaces[0]
      usbInterface.claim()
      
      // 아웃 엔드포인트 찾기 (프린터로 데이터 전송용)
      let outEndpoint = null
      for (const endpoint of usbInterface.endpoints) {
        if (endpoint.direction === 'out') {
          outEndpoint = endpoint
          break
        }
      }
      
      if (!outEndpoint) {
        throw new Error('출력 엔드포인트를 찾을 수 없습니다')
      }
      
      // 데이터 전송
      const buffer = printer.getBuffer()
      console.log('프린터로 전송할 버퍼 길이:', buffer.length, '바이트')
      
      await new Promise<void>((resolve, reject) => {
        outEndpoint.transfer(buffer, (error: Error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
      
      // 자원 해제
      usbInterface.release(() => {
        usbDevice.close()
      })
      
    } catch (error) {
      // 에러 발생 시 장치 닫기 시도
      try {
        usbDevice.close()
      } catch {}
      throw error
    }
  } catch (error) {
    console.error('주문서 출력 실패:', error)
    throw new Error('주문서 출력에 실패했습니다')
  }
})

// 파일 시스템 핸들러
ipcMain.handle('fs:ensureDir', async (_, dirPath: string) => {
  const fullPath = path.join(DATA_DIR, dirPath)
  try {
    await fs.access(fullPath)
  } catch {
    await fs.mkdir(fullPath, { recursive: true })
  }
})

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  const fullPath = path.join(DATA_DIR, filePath)
  try {
    return await fs.readFile(fullPath, 'utf-8')
  } catch {
    return ''
  }
})

ipcMain.handle('fs:writeFile', async (_, { filePath, content }: { filePath: string; content: string }) => {
  const fullPath = path.join(DATA_DIR, filePath)
  const dir = path.dirname(fullPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(fullPath, content, 'utf-8')
})

// 프린터 관련 코드
const PRINTER_CONFIG_PATH = path.join(app.getPath('userData'), 'printer.json')

async function savePrinterConfig(config: any) {
  await fs.writeFile(PRINTER_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

async function loadPrinterConfig() {
  try {
    const data = await fs.readFile(PRINTER_CONFIG_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function deletePrinterConfig() {
  try {
    await fs.access(PRINTER_CONFIG_PATH)
    await fs.unlink(PRINTER_CONFIG_PATH)
  } catch {
    // 파일이 없는 경우 무시
  }
}

// Google OAuth 처리를 위한 함수
function handleGoogleAuth(mainWindow: BrowserWindow, authURL: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // OAuth 전용 인증 창 생성
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        parent: mainWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // 인증 URL 로드
      authWindow.loadURL(authURL);
      
      // 개발자 도구 열기 (개발 중에만 사용)
      if (process.env.NODE_ENV === 'development') {
        authWindow.webContents.openDevTools();
      }

      // 콘솔 메시지 캡처 (디버깅용)
      authWindow.webContents.on('console-message', (_, level, message) => {
        console.log(`[AUTH Window] ${message}`);
      });

      // URL 변경 감지하여 리디렉션 발생 시 토큰 추출
      authWindow.webContents.on('will-navigate', (event, url) => {
        handleRedirect(authWindow, url, resolve, reject);
      });

      authWindow.webContents.on('will-redirect', (event, url) => {
        handleRedirect(authWindow, url, resolve, reject);
      });

      // 창이 닫힐 때 처리
      authWindow.on('closed', () => {
        reject(new Error('인증 창이 닫혔습니다.'));
      });
    } catch (error) {
      console.error('Google 인증 창 생성 오류:', error);
      reject(error);
    }
  });
}

// 리디렉션 URL에서 토큰 추출
function handleRedirect(authWindow: BrowserWindow, url: string, resolve: Function, reject: Function) {
  try {
    // 리디렉션 URL에서 토큰 확인
    if (url.includes('access_token=') || url.includes('code=')) {
      // URL에서 토큰 파라미터 추출
      const urlObj = new URL(url);
      const params = urlObj.hash ? new URLSearchParams(urlObj.hash.substring(1)) : new URLSearchParams(urlObj.search);
      
      // 토큰 정보 추출
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const code = params.get('code');
      
      // 결과 객체 생성
      const result = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn ? parseInt(expiresIn) : 3600,
        code
      };
      
      console.log('인증 성공! 토큰 정보 추출됨');
      
      // 창 닫기
      authWindow.close();
      
      // 결과 반환
      resolve(result);
    }
    
    // 오류 발생 시 확인
    if (url.includes('error=')) {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      const error = params.get('error');
      
      // 창 닫기
      authWindow.close();
      
      // 오류 반환
      reject(new Error(`인증 오류: ${error}`));
    }
  } catch (error) {
    console.error('리디렉션 처리 오류:', error);
    reject(error);
  }
}

// IPC 이벤트 처리 설정
ipcMain.handle('auth:google-oauth', async (event, authURL) => {
  try {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) {
      throw new Error('메인 윈도우를 찾을 수 없습니다.');
    }
    
    // Google OAuth 처리
    const result = await handleGoogleAuth(mainWindow, authURL);
    return result;
  } catch (error) {
    console.error('Google OAuth 처리 오류:', error);
    throw error;
  }
});

// 앱 정보와 유틸리티 핸들러
ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')
process.env.DIST_ELECTRON = path.join(__dirname)

let win: BrowserWindow | null
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// 로드 오류 및 앱 상태 추적용 변수
let isAppReady = false
let loadErrorOccurred = false

async function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    width: 1200,
    height: 800,
    // 로딩 중에는 화면을 표시하지 않음
    show: false
  })

  // 개발자 도구는 항상 열어서 디버깅 가능하게 함
  win.webContents.openDevTools();
  
  // 윈도우가 준비되면 표시
  win.once('ready-to-show', () => {
    if (!loadErrorOccurred) {
      win?.show()
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    console.log('페이지 로드 완료!')
  })

  // 페이지 로드 오류 처리
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    loadErrorOccurred = true
    console.error(`페이지 로드 실패: ${errorCode} ${errorDescription}, URL: ${validatedURL}, isMainFrame: ${isMainFrame}`);
    
    // 로드 실패 시 기본 페이지 표시
    if (isMainFrame && isAppReady) {
      win?.loadFile(path.join(__dirname, 'error.html'))
      .catch(err => console.error('에러 페이지 로드 실패:', err))
    }
  })

  // 렌더러 프로세스 충돌 감지
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('렌더러 프로세스 종료:', details.reason, details.exitCode);
  })

  // 렌더러 프로세스 응답 없음 감지
  win.webContents.on('unresponsive', () => {
    console.error('렌더러 프로세스가 응답하지 않습니다.');
  })

  // 정적 파일 요청 처리 (이미지 로드 문제 해결)
  win.webContents.session.webRequest.onBeforeRequest(
    { urls: ['*://*/*', 'file://*'] },
    (details, callback) => {
      // 데이터 URL인 경우 변환하지 않음
      if (details.url.startsWith('data:')) {
        callback({});
        return;
      }

      try {
        if (details.url.startsWith('file://')) {
          // file:// 프로토콜 요청 처리
          const urlPath = details.url.replace('file://', '');
          
          // 경로에 /images/가 포함되어 있는지 확인
          if (urlPath.includes('/images/')) {
            console.log(`[file 프로토콜 요청 감지] ${details.url}`);
            
            // /images/tree.png와 같은 패턴인지 확인
            if (urlPath.includes('tree.png')) {
              console.log(`[tree.png 변환] -> app-public://images/tree.png`);
              callback({ redirectURL: `app-public://images/tree.png` });
              return;
            }
            
            // 메뉴 이미지인지 확인
            if (urlPath.includes('/images/menu/')) {
              // 파일 이름만 추출
              const fileName = urlPath.split('/').pop();
              console.log(`[메뉴 이미지 변환] -> app-image://menu/${fileName}`);
              callback({ redirectURL: `app-image://menu/${fileName}` });
              return;
            }
            
            // 기타 이미지
            const pathParts = urlPath.split('/');
            const imageIndex = pathParts.findIndex(part => part === 'images');
            if (imageIndex >= 0) {
              const imagePath = pathParts.slice(imageIndex).join('/');
              console.log(`[일반 이미지 변환] -> app-public://${imagePath}`);
              callback({ redirectURL: `app-public://${imagePath}` });
              return;
            }
          }
        } else {
          // http나 https 요청 처리 (기존 로직)
          try {
            const urlObj = new URL(details.url);
            
            if (urlObj.pathname.startsWith('/images/')) {
              if (urlObj.pathname.startsWith('/images/menu/')) {
                console.log(`[이미지 요청 변환] ${urlObj.pathname} -> app-image://${urlObj.pathname.substring(8)}`);
                callback({ redirectURL: `app-image://${urlObj.pathname.substring(8)}` });
              } else {
                console.log(`[이미지 요청 변환] ${urlObj.pathname} -> app-public://${urlObj.pathname.substring(1)}`);
                callback({ redirectURL: `app-public://${urlObj.pathname.substring(1)}` });
              }
              return;
            }
          } catch (innerError) {
            console.error('URL 파싱 오류:', innerError, details.url);
          }
        }
      } catch (error) {
        console.error('URL 처리 오류:', error, details.url);
      }
      
      // 나머지 요청은 그대로 처리
      callback({});
    }
  );

  // 대화상자 핸들러 추가 - Google 로그인 관련 URL을 모두 시스템 브라우저로 열기
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('[윈도우 열기 요청 URL]', url);
    
    // 구글 인증 URL 직접 처리
    if (url.startsWith('https://accounts.google.com/o/oauth2/auth')) {
      console.log('[구글 로그인 URL 감지됨]', url);
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    // 외부 브라우저로 열 URL 패턴 목록
    const externalURLPatterns = [
      'accounts.google.com',
      'apis.google.com',
      'accounts.youtube.com',
      'firebaseauth',
      'auth/callback',
      'oauth',
      'signin'
    ];
    
    // URL이 외부 브라우저로 열어야 하는 패턴 중 하나와 일치하는지 확인
    if (externalURLPatterns.some(pattern => url.includes(pattern))) {
      console.log('[시스템 브라우저로 인증 URL 열기]', url);
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    // 다른 모든 URL은 앱 내에서 열기
    return { action: 'allow' };
  });

  console.log('앱 환경:', app.isPackaged ? '프로덕션' : '개발')
  console.log('DIST 경로:', process.env.DIST)
  console.log('PUBLIC 경로:', process.env.VITE_PUBLIC)
  console.log('USER DATA 경로:', app.getPath('userData'))
  console.log('DATA_DIR 경로:', DATA_DIR)
  console.log('DEV SERVER URL:', VITE_DEV_SERVER_URL || '없음')

  if (VITE_DEV_SERVER_URL) {
    console.log('개발 서버 URL로 로드 시도:', VITE_DEV_SERVER_URL)
    win.loadURL(VITE_DEV_SERVER_URL)
    .catch(err => {
      console.error('개발 서버 로드 실패:', err)
    })
  } else {
    const indexHtmlPath = path.join(process.env.DIST, 'index.html')
    console.log('프로덕션 빌드 파일 로드 시도:', indexHtmlPath)
    
    // index.html 파일이 존재하는지 확인
    try {
      fs_sync.accessSync(indexHtmlPath)
      console.log('index.html 파일 존재 확인됨')
    } catch (err) {
      console.error('index.html 파일이 존재하지 않음:', err)
    }
    
    win.loadFile(indexHtmlPath)
    .catch(err => {
      console.error('프로덕션 빌드 로드 실패:', err)
    })
  }
}

// 앱 초기화 및 라이프사이클 관리
app.whenReady().then(() => {
  isAppReady = true;
  console.log('앱 준비 완료');

  // 먼저 필요한 데이터 디렉토리 생성
  try {
    if (!fs_sync.existsSync(DATA_DIR)) {
      fs_sync.mkdirSync(DATA_DIR, { recursive: true });
      console.log('데이터 디렉토리 생성됨:', DATA_DIR);
    }
    
    if (!fs_sync.existsSync(IMAGE_DIR)) {
      fs_sync.mkdirSync(IMAGE_DIR, { recursive: true });
      console.log('이미지 디렉토리 생성됨:', IMAGE_DIR);
    }
  } catch (error) {
    console.error('디렉토리 생성 오류:', error);
  }

  // 앱이 패키지된 경우와 개발 모드에서의 경로 로깅
  const resourcesPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'public')
    : path.join(process.cwd(), 'public');
  
  console.log('앱 패키지 모드:', app.isPackaged ? '프로덕션' : '개발');
  console.log('리소스 경로:', resourcesPath);
  console.log('tree.png 경로 예상:', path.join(resourcesPath, 'images', 'tree.png'));
  
  // tree.png 파일 존재 확인
  try {
    const treePngPath = path.join(resourcesPath, 'images', 'tree.png');
    const exists = fs_sync.existsSync(treePngPath);
    console.log('tree.png 파일 존재:', exists, treePngPath);
  } catch (error) {
    console.error('파일 존재 확인 오류:', error);
  }

  // 메뉴 이미지용 프로토콜 등록
  protocol.registerFileProtocol('app-image', (request, callback) => {
    const url = request.url.slice('app-image://'.length);
    try {
      return callback({ path: path.join(IMAGES_BASE_DIR, url) });
    } catch (error) {
      console.error('이미지 프로토콜 처리 오류:', error);
      return callback({ error: -2 }); // -2는 파일 못찾음 에러
    }
  });

  // 정적 파일(public 폴더) 프로토콜 등록
  protocol.registerFileProtocol('app-public', (request, callback) => {
    const url = request.url.slice('app-public://'.length);
    try {
      // app.isPackaged가 true면 resources/public 폴더 사용
      // 개발 모드에서는 public 폴더 사용
      const publicPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'public') 
        : path.join(process.cwd(), 'public');
      
      console.log('정적 파일 요청:', url);
      const filePath = path.join(publicPath, url);
      console.log('정적 파일 경로:', filePath);
      
      // 파일 존재 확인
      if (fs_sync.existsSync(filePath)) {
        console.log('파일 존재함:', filePath);
      } else {
        console.error('파일이 존재하지 않음:', filePath);
      }
      
      return callback({ path: filePath });
    } catch (error) {
      console.error('정적 파일 프로토콜 처리 오류:', error);
      return callback({ error: -2 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 프린터 핸들러
ipcMain.handle('printer:getConfig', async () => {
  return await loadPrinterConfig()
})

ipcMain.handle('printer:saveConfig', async (_, config: any) => {
  await savePrinterConfig(config)
})

ipcMain.handle('printer:deleteConfig', async () => {
  await deletePrinterConfig()
}) 