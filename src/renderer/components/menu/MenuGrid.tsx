import React from 'react'
import { MenuItem } from '@/shared/types/menu'
import { InventoryItem } from '@/shared/types/inventory'
import { MenuCard } from './MenuCard'

interface MenuGridProps {
  menus: (MenuItem & { displayName: string; priceInfo: string })[]
  onEdit: (menu: MenuItem) => void
  onToggleSoldOut: (menuId: string) => void
  onDelete: (menu: MenuItem) => void
  getRelatedInventory: (menuId: string) => InventoryItem[]
  getInventoryNames: (inventoryItems: InventoryItem[]) => string
  hasAllRequiredInventory: (menuId: string) => boolean
  getMissingInventory: (menuId: string) => string
}

export function MenuGrid({
  menus,
  onEdit,
  onToggleSoldOut,
  onDelete,
  getRelatedInventory,
  getInventoryNames,
  hasAllRequiredInventory,
  getMissingInventory
}: MenuGridProps) {
  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {menus.map((menu) => (
          <MenuCard
            key={menu.id}
            menu={menu}
            onEdit={onEdit}
            onToggleSoldOut={onToggleSoldOut}
            onDelete={onDelete}
            getRelatedInventory={getRelatedInventory}
            getInventoryNames={getInventoryNames}
            hasAllRequiredInventory={hasAllRequiredInventory}
            getMissingInventory={getMissingInventory}
          />
        ))}
      </div>
    </div>
  )
} 