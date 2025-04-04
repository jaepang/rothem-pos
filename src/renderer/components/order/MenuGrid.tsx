import React from 'react'
import { MenuItem } from '@/shared/types/menu'
import { OrderItem } from '@/shared/types/order'
import { MenuCard } from './MenuCard'

interface MenuGridProps {
  displayMenus: MenuItem[]
  orderItems: OrderItem[]
  isEditMode: boolean
  selectedCardIndex: number | null
  selectedOriginalId: string | null
  getOriginalId: (id: string) => string
  showCompletedOrders: boolean
  onMenuCardClick: (index: number, menu: MenuItem) => void
  onUpdateQuantity: (itemId: string, isIce: boolean | undefined, isHot: boolean | undefined, newQuantity: number) => void
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  displayMenus,
  orderItems,
  isEditMode,
  selectedCardIndex,
  selectedOriginalId,
  getOriginalId,
  showCompletedOrders,
  onMenuCardClick,
  onUpdateQuantity
}) => {
  return (
    <div className={`grid ${
      showCompletedOrders 
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
    } gap-3`}>
      {displayMenus.map((menu, index) => {
        const isSelected = orderItems.some(item => 
          item.menuItem.id === menu.id && 
          item.menuItem.isIce === menu.isIce && 
          item.menuItem.isHot === menu.isHot
        )
        
        const selectedItem = isSelected ? orderItems.find(item => 
          item.menuItem.id === menu.id && 
          item.menuItem.isIce === menu.isIce && 
          item.menuItem.isHot === menu.isHot
        ) : null

        // 편집 모드에서 선택된 카드 표시 (메인 선택 또는 같은 원본 ID를 가진 변형)
        const isCardSelected = isEditMode && (
          selectedCardIndex === index || 
          (selectedOriginalId !== null && getOriginalId(menu.id) === selectedOriginalId)
        )
        
        const handleDecrease = (e: React.MouseEvent) => {
          e.stopPropagation()
          if (selectedItem) {
            onUpdateQuantity(
              menu.id,
              menu.isIce,
              menu.isHot,
              selectedItem.quantity - 1
            )
          }
        }
        
        const handleIncrease = (e: React.MouseEvent) => {
          e.stopPropagation()
          if (selectedItem) {
            onUpdateQuantity(
              menu.id,
              menu.isIce,
              menu.isHot,
              selectedItem.quantity + 1
            )
          }
        }
        
        return (
          <MenuCard
            key={`${menu.id}-${menu.isHot}-${menu.isIce}`}
            menu={menu}
            isSelected={isSelected}
            selectedQuantity={selectedItem?.quantity || null}
            isEditMode={isEditMode}
            isCardSelected={isCardSelected}
            onCardClick={() => onMenuCardClick(index, menu)}
            onDecrease={handleDecrease}
            onIncrease={handleIncrease}
          />
        )
      })}
    </div>
  )
} 