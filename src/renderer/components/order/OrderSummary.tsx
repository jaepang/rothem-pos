import React, { useState, useEffect } from 'react'
import { OrderItem } from '@/shared/types/order'
import { OrderItemList } from './OrderItemList'
import { MenuItem } from '@/shared/types/menu'
import { CouponModal } from './CouponModal'
import { useCoupon } from '@/renderer/hooks/useCoupon'

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
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const { 
    availableCoupons, 
    appliedCoupons, 
    applyCoupon, 
    removeAllCoupons, 
    removeCoupon,
    useCoupons, 
    getTotalCouponAmount,
    addCoupon,
    loadCoupons
  } = useCoupon()
  
  // 컴포넌트 마운트 시 쿠폰 데이터 로드
  useEffect(() => {
    loadCoupons()
  }, [loadCoupons])
  
  // 쿠폰 적용 후 최종 금액 계산
  const couponAmount = getTotalCouponAmount()
  const finalAmount = Math.max(0, totalAmount - couponAmount)
  
  const handleApplyCoupon = async (couponIds: string[]) => {
    const success = await applyCoupon(couponIds)
    if (success) {
      setIsCouponModalOpen(false)
    }
  }
  
  // 주문 처리 (쿠폰 적용 포함)
  const handleCreateOrder = async () => {
    // 쿠폰 사용 처리
    if (appliedCoupons.length > 0) {
      await useCoupons(totalAmount);
    }
    
    // 기존 주문 생성 함수 호출
    onCreateOrder();
  }
  
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
                  // 쿠폰도 함께 제거
                  removeAllCoupons()
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
        {appliedCoupons.length > 0 && (
          <div className="mb-3">
            <div className="text-sm font-medium mb-1">적용된 선불권</div>
            <ul className="space-y-1">
              {appliedCoupons.map(coupon => (
                <li key={coupon.id} className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded-md">
                  <div>
                    <span className="font-medium">{coupon.code}:</span> 
                    <span className="text-green-600 ml-1">-{coupon.balance.toLocaleString()}원</span>
                  </div>
                  <button
                    onClick={() => removeCoupon(coupon.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    제거
                  </button>
                </li>
              ))}
            </ul>
            {appliedCoupons.length > 1 && (
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-green-200">
                <span className="font-medium">총 할인액:</span>
                <span className="text-green-600 font-medium">-{couponAmount.toLocaleString()}원</span>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xl font-bold mb-3">
          합계: {finalAmount.toLocaleString()}원
          {appliedCoupons.length > 0 && <span className="text-sm text-gray-500 ml-2">(원래 가격: {totalAmount.toLocaleString()}원)</span>}
        </div>
        
        <div className="flex gap-2">
          <button
            className={`flex-1 py-3 rounded-lg text-lg font-medium ${
              hasSoldOutItems || isEditMode
                ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            onClick={handleCreateOrder}
            disabled={hasSoldOutItems || isEditMode}
            title={hasSoldOutItems ? "품절된 메뉴가 포함되어 있어 주문할 수 없습니다." : 
                  isEditMode ? "편집 모드에서는 주문할 수 없습니다." : ""}
          >
            {hasSoldOutItems ? '품절된 메뉴 포함' : 
            isEditMode ? '편집 모드에서는 주문 불가' : '주문하기'}
          </button>
          <button
            className="py-3 px-4 rounded-lg text-lg font-medium bg-green-500 text-white hover:bg-green-600"
            onClick={() => setIsCouponModalOpen(true)}
            disabled={isEditMode || !orderItems.length}
            title={
              isEditMode 
                ? "편집 모드에서는 선불권을 사용할 수 없습니다" 
                : !orderItems.length 
                  ? "주문 항목이 없습니다" 
                  : ""
            }
          >
            선불권 사용하기
          </button>
        </div>
      </div>
      
      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onApplyCoupon={handleApplyCoupon}
        availableCoupons={availableCoupons}
        onAddCoupon={addCoupon}
      />
    </div>
  )
}