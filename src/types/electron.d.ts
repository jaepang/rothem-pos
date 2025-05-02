import { MenuList } from '../types/menu'
import { Order } from '../types/order'
import { InventoryList } from '../types/inventory'
import { Coupon } from '../shared/types/coupon'

// 구글 관련 타입 정의 삭제 (Firebase로 대체됨)

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
  inventory: {
    loadInventoryFromJson: () => Promise<InventoryList>
    saveInventoryToJson: (inventoryList: InventoryList) => Promise<void>
  }
  orders: {
    loadOrdersFromJson: () => Promise<any[]>
    saveOrdersToJson: (orders: any[]) => Promise<boolean>
  }
  coupon: {
    loadCouponsFromJson: () => Promise<Coupon[]>
    saveCouponsToJson: (coupons: Coupon[]) => Promise<boolean>
  }
  printer: {
    initialize: () => Promise<boolean>
    getStatus: () => Promise<boolean>
    printOrder: (order: Order) => Promise<void>
  }
  // 구글 관련 API 제거 (Firebase로 대체됨)
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
} 