import React, { useState } from 'react'
import { Order } from '@/shared/types/order'

interface OrderCardProps {
  order: Order
  onComplete: (orderId: string) => void
  onCancel: (orderId: string) => void
  onDelete?: (orderId: string) => void
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onComplete,
  onCancel,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusLabel = () => {
    switch (order.status) {
      case 'completed':
        return <span className="text-green-600 font-medium">완료</span>
      case 'cancelled':
        return <span className="text-red-600 font-medium">취소</span>
      default:
        return <span className="text-blue-600 font-medium">처리중</span>
    }
  }

  const getTimeDisplay = () => {
    const orderTime = new Date(order.orderDate).toLocaleString('ko-KR', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    })

    if (order.status === 'completed' && order.completedAt) {
      const completedTime = new Date(order.completedAt).toLocaleString('ko-KR', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      })
      return `${orderTime}~${completedTime}`
    }

    return new Date(order.orderDate).toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    })
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">
            {getTimeDisplay()}
          </span>
          {getStatusLabel()}
        </div>
        <div className="text-lg font-bold">
          {order.totalAmount.toLocaleString()}원
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map(item => (
          <div
            key={`${item.menuItem.id}-${item.menuItem.isHot}-${item.menuItem.isIce}`}
            className={`flex justify-between text-sm ${item.menuItem.isSoldOut ? 'opacity-50 line-through text-gray-400' : ''}`}
          >
            <div className="flex gap-1">
              <span>{item.menuItem.displayName}</span>
              {item.menuItem.isSoldOut && <span className="text-red-500 ml-1">(품절)</span>}
              <span className="text-gray-600">× {item.quantity}</span>
            </div>
            <span className="text-gray-600">{(item.menuItem.price * item.quantity).toLocaleString()}원</span>
          </div>
        ))}
      </div>

      <div className="flex items-top justify-between gap-3">
        <div 
          className={`text-sm text-gray-600 cursor-pointer flex-1 ${isExpanded ? '' : 'truncate'}`}
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? '접기' : '펼치기'}
        >
          {order.memo ? `메모: ${order.memo}` : ''}
        </div>
        <div className="flex gap-2 shrink-0">
          {order.status === 'pending' ? (
            <>
              <button
                onClick={() => onComplete(order.id)}
                className="h-8 px-3 rounded bg-green-500 text-white hover:bg-green-600 text-sm font-medium"
                disabled={order.items.some(item => item.menuItem.isSoldOut)}
                title={order.items.some(item => item.menuItem.isSoldOut) ? '품절된 메뉴가 포함되어 있습니다' : ''}
              >
                완료
              </button>
              <button
                onClick={() => onCancel(order.id)}
                className="h-8 px-3 rounded bg-red-500 text-white hover:bg-red-600 text-sm font-medium"
              >
                취소
              </button>
            </>
          ) : order.status === 'cancelled' && onDelete && (
            <button
              onClick={() => onDelete(order.id)}
              className="h-8 px-3 rounded bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium"
            >
              지우기
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 