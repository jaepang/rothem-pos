import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { writeFile, readFile } from 'fs/promises'
import { printOrder } from './printer'
import { MenuItem } from '../types/menu'

// 메뉴 데이터를 저장할 Store 초기화
const store = new Store<{
  recentMenus: MenuItem[];
  favorites: string[];
}>({
  defaults: {
    recentMenus: [],
    favorites: []
  }
})

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // 개발 모드에서는 로컬 서버를, 프로덕션에서는 빌드된 파일을 로드
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 메뉴 데이터 저장
ipcMain.handle('save-menu', async (_, menuData: MenuItem[]) => {
  try {
    await writeFile('menu.json', JSON.stringify(menuData, null, 2))
    store.set('recentMenus', menuData)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
})

// 메뉴 데이터 로드
ipcMain.handle('load-menu', async () => {
  try {
    const data = await readFile('menu.json', 'utf-8')
    const menus = JSON.parse(data) as MenuItem[]
    store.set('recentMenus', menus)
    return { success: true, data: menus }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { success: true, data: store.get('recentMenus', []) }
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
})

// 엑셀 파일 처리
ipcMain.handle('import-excel', async (_, filePath: string) => {
  try {
    const data = await readFile(filePath)
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
})

// 프린터 관련 설정
ipcMain.handle('print-order', async (_, orderData) => {
  try {
    const success = await printOrder(orderData)
    return { success }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: errorMessage }
  }
})