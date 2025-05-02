import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as fs } from 'node:fs'
import fs_sync from 'node:fs'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'
import { URL } from 'node:url'
import { release } from 'node:os'
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

const IMAGE_DIR = path.join(process.cwd(), 'public', 'images', 'menu')

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
    
    // 상대 경로 반환 (public 기준)
    return `/images/menu/${fileName}`
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

const MENU_FILE_PATH = path.join(process.cwd(), 'data', 'menu.json')
const INVENTORY_FILE_PATH = path.join(process.cwd(), 'data', 'inventory.json')
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'orders.json')
const COUPONS_FILE_PATH = path.join(process.cwd(), 'data', 'coupons.json')

// IPC 핸들러 등록
ipcMain.handle('menu:loadFromJson', async () => {
  try {
    if (!fs_sync.existsSync(MENU_FILE_PATH)) {
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
const DATA_DIR = path.join(app.getPath('userData'), 'data')

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
  })

  // 개발자 도구 활성화 (개발 중에만)
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools();
  } else {
    // 빌드된 앱에서도 개발자 도구 활성화 (인증 URL 확인용)
    win.webContents.openDevTools();
  }

  // Firebase 요청 URL 로깅
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*.googleapis.com/*', '*://*.google.com/*', '*://*.firebaseapp.com/*', '*://*.firebase.com/*'] }, 
    (details, callback) => {
      console.log('[Firebase URL 요청]', details.method, details.url);
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

  // 브라우저 창에서 새 창으로 탐색하는 것을 감지
  win.webContents.on('will-navigate', (event, url) => {
    console.log('[페이지 탐색 요청]', url);
    
    // Firebase 인증 관련 URL인 경우 시스템 브라우저로 열기
    if (url.includes('accounts.google.com') || 
        url.includes('apis.google.com') || 
        url.includes('oauth') || 
        url.includes('signin')) {
      event.preventDefault();
      console.log('[외부 브라우저로 리다이렉트]', url);
      shell.openExternal(url);
    }
  });

  // 네트워크 요청 로깅
  win.webContents.session.webRequest.onCompleted({ urls: ['<all_urls>'] }, (details) => {
    if (details.url.includes('google') || 
        details.url.includes('firebase') || 
        details.url.includes('oauth') || 
        details.url.includes('auth')) {
      console.log(`[네트워크 요청 완료] ${details.statusCode} ${details.method} ${details.url}`);
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

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