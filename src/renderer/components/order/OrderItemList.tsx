import React from 'react'
import { OrderItem } from '@/shared/types/order'
import { MenuItem } from '@/shared/types/menu'

interface OrderItemListProps {
  orderItems: OrderItem[]
  menus: MenuItem[]
  getOriginalId: (id: string) => string
  onUpdateQuantity: (itemId: string, isIce: boolean | undefined, isHot: boolean | undefined, newQuantity: number) => void
}

export const OrderItemList: React.FC<OrderItemListProps> = ({
  orderItems,
  menus,
  getOriginalId,
  onUpdateQuantity
}) => {
  if (orderItems.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-2 max-h-[300px] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {orderItems.map(item => {
          // 현재 메뉴 품절 상태 확인
          const originalId = getOriginalId(item.menuItem.id)
          const currentMenu = menus.find(menu => menu.id === originalId)
          const isSoldOut = currentMenu ? currentMenu.isSoldOut : false
          
          return (
            <div
              key={`${item.menuItem.id}-${item.menuItem.isHot}-${item.menuItem.isIce}`}
              className={`flex items-center justify-between p-3 bg-white border rounded-lg ${
                isSoldOut ? 'opacity-70 border-red-300 bg-red-50' : ''
              }`}
            >
              <div className="font-medium truncate mr-4">
                {item.menuItem.displayName}
                {isSoldOut && <span className="text-red-500 ml-1">(품절)</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-600">{item.menuItem.price.toLocaleString()}원</span>
                <div
                  className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer"
                  onClick={() =>
                    onUpdateQuantity(
                      item.menuItem.id,
                      item.menuItem.isIce,
                      item.menuItem.isHot,
                      item.quantity - 1
                    )
                  }
                >
                  -
                </div>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <div
                  className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer"
                  onClick={() =>
                    onUpdateQuantity(
                      item.menuItem.id,
                      item.menuItem.isIce,
                      item.menuItem.isHot,
                      item.quantity + 1
                    )
                  }
                  aria-disabled={isSoldOut}
                  style={isSoldOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  +
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 