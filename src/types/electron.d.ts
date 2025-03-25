import { MenuList } from '../types/menu';
import { Order } from '../types/order';

interface ElectronAPI {
  versions: NodeJS.ProcessVersions
  path: {
    join: (...args: string[]) => Promise<string>
    resolve: (...args: string[]) => Promise<string>
  }
  fs: {
    saveImage: (buffer: ArrayBuffer, menuId: string) => Promise<string>
    deleteImage: (imageUrl: string) => Promise<void>
  }
  menu: {
    loadMenuFromJson: () => Promise<MenuList>
    saveMenuToJson: (menuList: MenuList) => Promise<void>
  }
  printer: {
    initialize: () => Promise<boolean>
    getStatus: () => Promise<boolean>
    printOrder: (order: Order) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
} 