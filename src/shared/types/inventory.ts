import { MenuItem } from './menu'

export interface InventoryItem {
  id: string
  name: string
  unit: string
  quantity: number
  relatedMenuIds: string[] // 관련 메뉴 ID 목록
}

export type InventoryList = InventoryItem[] 