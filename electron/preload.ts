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

// Expose protected methods that allow the renderer process to use
// Node.js functionality without exposing the entire API
contextBridge.exposeInMainWorld('electronAPI', {
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
})

// Electron 환경 설정
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', { filePath, content }),
    ensureDir: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath)
  },
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion')
})

// IPC 통신용 API
contextBridge.exposeInMainWorld('electronIPC', {
  // 일반 IPC 통신
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data)
  },
  
  // 동기 IPC 통신 (응답을 기다림)
  sendSync: (channel: string, ...args: any[]) => {
    return ipcRenderer.sendSync(channel, ...args)
  },
  
  // 이벤트 리스너 등록
  on: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  },
  
  // 일회용 이벤트 리스너 등록
  once: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.once(channel, (event, ...args) => func(...args))
  },
  
  // Promise 기반 통신 (응답을 기다림)
  invoke: (channel: string, data?: any) => {
    return ipcRenderer.invoke(channel, data)
  }
})

// 경로 관련 API
contextBridge.exposeInMainWorld('paths', {
  join: (...args: string[]) => ipcRenderer.invoke('path:join', ...args),
  resolve: (...args: string[]) => ipcRenderer.invoke('path:resolve', ...args)
})

// 메뉴 데이터 API
contextBridge.exposeInMainWorld('menuData', {
  loadFromJson: async () => {
    return ipcRenderer.invoke('menu:loadFromJson')
  },
  
  saveToJson: async (menuList: any[]) => {
    return ipcRenderer.invoke('menu:saveToJson', menuList)
  }
})

// 재고 데이터 API
contextBridge.exposeInMainWorld('inventoryData', {
  loadFromJson: async () => {
    return ipcRenderer.invoke('inventory:loadFromJson')
  },
  
  saveToJson: async (inventoryList: any[]) => {
    return ipcRenderer.invoke('inventory:saveToJson', inventoryList)
  }
})

// 주문 데이터 API
contextBridge.exposeInMainWorld('orderData', {
  loadFromJson: async () => {
    return ipcRenderer.invoke('orders:loadFromJson')
  },
  
  saveToJson: async (orders: any[]) => {
    return ipcRenderer.invoke('orders:saveToJson', orders)
  }
})

// 선불권 데이터 API
contextBridge.exposeInMainWorld('couponData', {
  loadFromJson: async () => {
    return ipcRenderer.invoke('coupon:loadFromJson')
  },
  
  saveToJson: async (coupons: any[]) => {
    return ipcRenderer.invoke('coupon:saveToJson', coupons)
  }
})

// 프린터 API
contextBridge.exposeInMainWorld('printer', {
  getAvailablePrinters: async () => {
    return ipcRenderer.invoke('printer:getAvailable')
  },
  
  savePrinterConfig: async (config: ReceiptPrinterOptions) => {
    return ipcRenderer.invoke('printer:saveConfig', config)
  },
  
  loadPrinterConfig: async () => {
    return ipcRenderer.invoke('printer:loadConfig')
  },
  
  deletePrinterConfig: async () => {
    return ipcRenderer.invoke('printer:deleteConfig')
  },
  
  printReceipt: async (data: any, options: ReceiptPrinterOptions) => {
    return ipcRenderer.invoke('printer:printReceipt', data, options)
  },
  
  closeDay: async (data: any, options: ReceiptPrinterOptions) => {
    return ipcRenderer.invoke('printer:closeDay', data, options)
  }
}) 