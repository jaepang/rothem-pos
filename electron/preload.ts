import { contextBridge, ipcRenderer } from 'electron'

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
  printer: {
    initialize: () => 
      ipcRenderer.invoke('printer:initialize'),
    getStatus: () => 
      ipcRenderer.invoke('printer:getStatus'),
    printOrder: (order: any) => 
      ipcRenderer.invoke('printer:printOrder', order),
  }
})

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => {
      ipcRenderer.send(channel, data)
    },
    sendSync: (channel: string, ...args: any[]) => {
      return ipcRenderer.sendSync(channel, ...args)
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    },
    once: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (event, ...args) => func(...args))
    },
    invoke: (channel: string, data: any) => {
      return ipcRenderer.invoke(channel, data)
    }
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', { filePath, content }),
    ensureDir: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath)
  }
}) 