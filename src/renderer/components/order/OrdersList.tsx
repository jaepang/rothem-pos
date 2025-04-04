import React from 'react'
import { Order } from '@/shared/types/order'
import { OrderCard } from './OrderCard'

interface OrdersListProps {
  orders: Order[]
  title: string
  onComplete: (orderId: string) => void
  onCancel: (orderId: string) => void
  onDelete?: (orderId: string) => void
  showList?: boolean
  emptyMessage?: string
  withToggleButton?: boolean
  onToggleShowCompleted?: () => void
  showCompletedOrders?: boolean
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  title,
  onComplete,
  onCancel,
  onDelete,
  showList = true,
  emptyMessage = "주문이 없습니다",
  withToggleButton = false,
  onToggleShowCompleted,
  showCompletedOrders
}) => {
  if (!showList) {
    return null
  }

  return (
    <div className="lg:col-span-3 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className={`${withToggleButton ? 'flex justify-between items-center' : ''} pt-6 pb-4`}>
          <h2 className="text-3xl font-bold">{title}</h2>
          {withToggleButton && onToggleShowCompleted && (
            <button
              onClick={onToggleShowCompleted}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              상세보기
              <svg
                className={`w-4 h-4 transform transition-transform ${showCompletedOrders ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        <div className="space-y-2 pb-6">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onComplete={onComplete}
              onCancel={onCancel}
              onDelete={onDelete && order.status === 'cancelled' ? onDelete : undefined}
            />
          ))}
          {orders.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 