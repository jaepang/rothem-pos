import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// IPC Handlers
ipcMain.handle('path:join', (_, ...args) => path.join(...args))
ipcMain.handle('path:resolve', (_, ...args) => path.resolve(...args))

const IMAGE_DIR = path.join(process.cwd(), 'public', 'images', 'menu')

// File system handlers
ipcMain.handle('fs:saveImage', async (_, buffer: ArrayBuffer, menuId: string) => {
  try {
    // 이미지 디렉토리가 없으면 생성
    if (!fs.existsSync(IMAGE_DIR)) {
      fs.mkdirSync(IMAGE_DIR, { recursive: true })
    }

    const fileName = `${menuId}.jpg`
    const filePath = path.join(IMAGE_DIR, fileName)
    
    // 파일 저장
    fs.writeFileSync(filePath, Buffer.from(buffer))
    
    // 상대 경로 반환 (public 기준)
    return `/images/menu/${fileName}`
  } catch (error) {
    console.error('이미지 저장 실패:', error)
    throw error
  }
})

ipcMain.handle('fs:deleteImage', (_, imageUrl: string) => {
  try {
    const fileName = imageUrl.split('/').pop()
    if (!fileName) return

    const filePath = path.join(IMAGE_DIR, fileName)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error('이미지 삭제 실패:', error)
    throw error
  }
})

const MENU_FILE_PATH = path.join(process.cwd(), 'data', 'menu.json')

// IPC 핸들러 등록
ipcMain.handle('menu:loadFromJson', () => {
  try {
    if (!fs.existsSync(MENU_FILE_PATH)) {
      return []
    }
    const data = fs.readFileSync(MENU_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('메뉴 데이터 로드 실패:', error)
    throw error
  }
})

ipcMain.handle('menu:saveToJson', (_, menuList) => {
  try {
    const dirPath = path.dirname(MENU_FILE_PATH)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menuList, null, 2))
  } catch (error) {
    console.error('메뉴 데이터 저장 실패:', error)
    throw error
  }
})

// 프린터 설정
const printerConfig = {
  type: PrinterTypes.EPSON,
  interface: 'printer:POS-58',
  options: {
    timeout: 3000
  }
}

let printer: ThermalPrinter | null = null

// 프린터 IPC 핸들러
ipcMain.handle('printer:initialize', async () => {
  try {
    printer = new ThermalPrinter(printerConfig)
    await printer.isPrinterConnected()
    return true
  } catch (error) {
    console.error('프린터 초기화 실패:', error)
    printer = null
    return false
  }
})

ipcMain.handle('printer:getStatus', async () => {
  if (!printer) {
    return false
  }
  try {
    return await printer.isPrinterConnected()
  } catch (error) {
    console.error('프린터 상태 확인 실패:', error)
    return false
  }
})

ipcMain.handle('printer:printOrder', async (_, order) => {
  if (!printer) {
    throw new Error('프린터가 연결되지 않았습니다.')
  }

  try {
    const p = printer
    // 헤더 출력
    p.alignCenter()
    p.bold(true)
    p.setTextSize(1, 1)
    p.println('주문서')
    p.println('===================')
    p.bold(false)
    p.alignLeft()

    // 주문 정보 출력
    p.println(`주문번호: ${order.id}`)
    p.println(`주문시간: ${new Date(order.orderDate).toLocaleString()}`)
    p.println('-------------------')

    // 주문 항목 출력
    order.items.forEach((item: any) => {
      p.println(`${item.menuItem.name} x ${item.quantity}`)
      p.alignRight()
      p.println(`${(item.menuItem.price * item.quantity).toLocaleString()}원`)
      p.alignLeft()
    })

    // 합계 출력
    p.println('===================')
    p.bold(true)
    p.println('합계')
    p.alignRight()
    p.println(`${order.totalAmount.toLocaleString()}원`)
    p.alignLeft()
    p.bold(false)

    // 메모 출력
    if (order.memo) {
      p.println('-------------------')
      p.println('메모:')
      p.println(order.memo)
    }

    // 푸터 출력
    p.println('\n\n')
    p.cut()
    await p.execute()
  } catch (error) {
    console.error('주문서 출력 실패:', error)
    throw new Error('주문서 출력에 실패했습니다.')
  }
})

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

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // Convert the file path to a file URL
    const fileUrl = new URL(`file://${path.join(process.env.DIST, 'index.html')}`).href
    win.loadURL(fileUrl)
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow) 