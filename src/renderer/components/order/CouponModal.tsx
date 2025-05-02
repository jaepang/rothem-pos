import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Coupon } from '@/shared/types/coupon'

interface CouponModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyCoupon: (selectedCoupons: string[]) => void
  availableCoupons: Coupon[]
  onAddCoupon?: (name: string, amount: number) => Promise<boolean>
}

export const CouponModal: React.FC<CouponModalProps> = ({
  isOpen,
  onClose,
  onApplyCoupon,
  availableCoupons,
  onAddCoupon
}) => {
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([])
  const [showAddCoupon, setShowAddCoupon] = useState(false)
  const [newCouponName, setNewCouponName] = useState('')
  const [newCouponAmount, setNewCouponAmount] = useState<number>(0)
  const [isAddingCoupon, setIsAddingCoupon] = useState(false)
  
  const handleCheckboxChange = (couponId: string) => {
    setSelectedCoupons(prev => {
      if (prev.includes(couponId)) {
        return prev.filter(id => id !== couponId)
      } else {
        return [...prev, couponId]
      }
    })
  }
  
  const handleApply = () => {
    if (selectedCoupons.length > 0) {
      onApplyCoupon(selectedCoupons)
      setSelectedCoupons([])
    }
  }

  const handleAddCoupon = async () => {
    if (newCouponName.trim() && newCouponAmount > 0 && onAddCoupon) {
      setIsAddingCoupon(true)
      try {
        const success = await onAddCoupon(newCouponName, newCouponAmount)
        if (success) {
          setNewCouponName('')
          setNewCouponAmount(0)
          setShowAddCoupon(false)
        }
      } catch (error) {
        console.error('선불권 추가 실패:', error)
      } finally {
        setIsAddingCoupon(false)
      }
    }
  }
  
  const closeAndReset = () => {
    onClose()
    setSelectedCoupons([])
    setShowAddCoupon(false)
    setNewCouponName('')
    setNewCouponAmount(0)
    setIsAddingCoupon(false)
  }
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={closeAndReset}
      title="선불권 사용하기"
    >
      <div className="space-y-4">
        <div className="max-h-60 overflow-y-auto">
          {availableCoupons.length > 0 ? (
            <ul className="space-y-2">
              {availableCoupons.map(coupon => (
                <li key={coupon.id} className="flex items-center p-2 hover:bg-gray-50 rounded-md">
                  <input
                    type="checkbox"
                    id={`coupon-${coupon.id}`}
                    checked={selectedCoupons.includes(coupon.id)}
                    onChange={() => handleCheckboxChange(coupon.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`coupon-${coupon.id}`} className="ml-2 flex-1 flex justify-between">
                    <span>{coupon.code}</span>
                    <span className="font-medium">잔액: {coupon.balance.toLocaleString()}원</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">사용 가능한 선불권이 없습니다</p>
          )}
        </div>
        
        {showAddCoupon ? (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label htmlFor="newCouponName" className="block text-sm font-medium text-gray-700">
                  선불권 이름
                </label>
                <input
                  type="text"
                  id="newCouponName"
                  value={newCouponName}
                  onChange={(e) => setNewCouponName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="선불권 이름을 입력하세요"
                  disabled={isAddingCoupon}
                />
              </div>
              
              <div>
                <label htmlFor="newCouponAmount" className="block text-sm font-medium text-gray-700">
                  금액
                </label>
                <input
                  type="number"
                  id="newCouponAmount"
                  value={newCouponAmount || ''}
                  onChange={(e) => setNewCouponAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="금액을 입력하세요"
                  min="0"
                  disabled={isAddingCoupon}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-3">
              <button 
                onClick={() => setShowAddCoupon(false)}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                disabled={isAddingCoupon}
              >
                취소
              </button>
              <button
                onClick={handleAddCoupon}
                disabled={!newCouponName.trim() || newCouponAmount <= 0 || isAddingCoupon || !onAddCoupon}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isAddingCoupon ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCoupon(true)}
            className="w-full py-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            + 선불권 추가하기
          </button>
        )}
        
        <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200">
          <button
            onClick={closeAndReset}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={selectedCoupons.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            적용하기
          </button>
        </div>
      </div>
    </Modal>
  )
} 