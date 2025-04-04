import React from 'react'
import { OrderItem } from '@/shared/types/order'
import { OrderItemList } from './OrderItemList'
import { MenuItem } from '@/shared/types/menu'

interface OrderSummaryProps {
  orderItems: OrderItem[]
  menus: MenuItem[]
  memo: string
  onMemoChange: (memo: string) => void
  onUpdateQuantity: (itemId: string, isIce: boolean | undefined, isHot: boolean | undefined, newQuantity: number) => void
  onClearOrderItems: () => void
  onCreateOrder: () => void
  isEditMode: boolean
  hasSoldOutItems: boolean
  totalAmount: number
  getOriginalId: (id: string) => string
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderItems,
  menus,
  memo,
  onMemoChange,
  onUpdateQuantity,
  onClearOrderItems,
  onCreateOrder,
  isEditMode,
  hasSoldOutItems,
  totalAmount,
  getOriginalId
}) => {
  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-medium text-gray-900">
            메모
          </h4>
          {orderItems.length > 0 && (
            <button
              className="px-4 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
              onClick={() => {
                if (window.confirm('주문 목록을 모두 삭제하시겠습니까?')) {
                  onClearOrderItems()
                }
              }}
            >
              주문 목록 초기화
            </button>
          )}
        </div>
        <textarea
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={memo}
          onChange={e => onMemoChange(e.target.value)}
          rows={1}
        />
      </div>

      {orderItems.length > 0 && (
        <OrderItemList
          orderItems={orderItems}
          menus={menus}
          getOriginalId={getOriginalId}
          onUpdateQuantity={onUpdateQuantity}
        />
      )}

      <div className="pt-3">
        <div className="text-xl font-bold mb-3">
          합계: {totalAmount.toLocaleString()}원
        </div>
        <button
          className={`w-full py-3 rounded-lg text-lg font-medium ${
            hasSoldOutItems || isEditMode
              ? 'bg-gray-400 cursor-not-allowed text-gray-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          onClick={onCreateOrder}
          disabled={hasSoldOutItems || isEditMode}
          title={hasSoldOutItems ? "품절된 메뉴가 포함되어 있어 주문할 수 없습니다." : 
                 isEditMode ? "편집 모드에서는 주문할 수 없습니다." : ""}
        >
          {hasSoldOutItems ? '품절된 메뉴 포함' : 
           isEditMode ? '편집 모드에서는 주문 불가' : '주문하기'}
        </button>
      </div>
    </div>
  )
} 