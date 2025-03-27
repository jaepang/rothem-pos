import React, { useState } from 'react'
import { Order } from '@/shared/types/order'

interface PendingOrderCardProps {
  order: Order
  onComplete: (orderId: string) => void
  onCancel: (orderId: string) => void
}

const PendingOrderCard: React.FC<PendingOrderCardProps> = ({
  order,
  onComplete,
  onCancel
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const isCompleted = order.status === 'completed'

  return (
    <div className="p-4 rounded-lg border">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className={`text-sm px-2 py-0.5 rounded ${
              isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100'
            }`}>
              {isCompleted ? '완료' : '처리중'}
            </span>
            <span className="text-sm text-gray-600">
              {new Date(order.orderDate).toLocaleString()}
            </span>
          </div>
          <span className="font-medium">
            {order.totalAmount.toLocaleString()}원
          </span>
        </div>
        <div className="space-y-1.5">
          {order.items.map((item, idx) => (
            <div key={`${order.id}-${idx}`} className="text-sm flex justify-between gap-4">
              <span className="truncate">{item.menuItem.displayName} × {item.quantity}</span>
              <span className="text-gray-600 shrink-0">{(item.menuItem.price * item.quantity).toLocaleString()}원</span>
            </div>
          ))}
        </div>
        <div className="flex items-top justify-between gap-3">
          <div className={`text-sm text-gray-600 cursor-pointer flex-1 ${
            isExpanded ? '' : 'truncate'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? '접기' : '펼치기'}
          >
            {order.memo ? `메모: ${order.memo}` : ''}
          </div>
          {!isCompleted && (
            <div className="flex gap-2 shrink-0">
              <button
                className="h-8 px-3 rounded bg-green-500 text-white hover:bg-green-600 text-sm font-medium"
                onClick={() => onComplete(order.id)}
              >
                완료
              </button>
              <button
                className="h-8 px-3 rounded bg-red-500 text-white hover:bg-red-600 text-sm font-medium"
                onClick={() => onCancel(order.id)}
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { PendingOrderCard } 