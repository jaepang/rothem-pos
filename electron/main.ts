import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promises as fs } from 'node:fs'
import fs_sync from 'node:fs'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'
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
  })

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