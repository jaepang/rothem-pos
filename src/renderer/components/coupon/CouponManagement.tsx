import React, { useState, useEffect } from 'react'
import { Coupon } from '@/shared/types/coupon'
import * as CouponUtils from '@/shared/utils/coupon'

const getCurrentUser = () => ({
  id: 'admin',
  name: '관리자'
})

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [newCouponName, setNewCouponName] = useState<string>('')
  const [newCouponAmount, setNewCouponAmount] = useState<number>(0)
  const [searchCode, setSearchCode] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'available' | 'used'>('all')
  const [showUsedCoupons, setShowUsedCoupons] = useState<boolean>(false)

  // 선불권 목록 로드
  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    try {
      setIsLoading(true)
      const loadedCoupons = await CouponUtils.loadCouponsFromJson()
      setCoupons(loadedCoupons)
    } catch (error) {
      console.error('선불권 목록 로드 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createCoupon = async () => {
    if (!newCouponName.trim()) {
      alert('선불권 이름을 입력해주세요.')
      return
    }

    if (newCouponAmount <= 0) {
      alert('선불권 금액을 입력해주세요.')
      return
    }

    try {
      const currentUser = getCurrentUser()
      const result = await CouponUtils.createCoupon(
        coupons,
        newCouponName.trim(),
        newCouponAmount,
        currentUser.id,
        currentUser.name
      )

      if (result.success) {
        alert(result.message)
        setNewCouponName('')
        setNewCouponAmount(0)
        await loadCoupons() // 데이터 새로고침
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('선불권 생성 오류:', error)
      alert('선불권 생성에 실패했습니다.')
    }
  }

  const searchCoupon = () => {
    if (!searchCode.trim()) {
      alert('검색할 선불권 코드를 입력해주세요.')
      return
    }

    const foundCoupon = coupons.find(coupon => 
      coupon.code.toLowerCase().includes(searchCode.toLowerCase())
    )

    if (foundCoupon) {
      const statusText = foundCoupon.isUsed ? '사용됨' : 
        foundCoupon.balance < foundCoupon.amount ? '부분 사용됨' : '사용 가능'
      
      alert(`선불권 정보:
코드: ${foundCoupon.code}
초기 금액: ${foundCoupon.amount.toLocaleString()}원
남은 잔액: ${foundCoupon.balance.toLocaleString()}원
상태: ${statusText}
생성일: ${new Date(foundCoupon.createdAt).toLocaleDateString()}${foundCoupon.usedAt ? `
사용일: ${new Date(foundCoupon.usedAt).toLocaleDateString()}` : ''}`)
    } else {
      alert('해당 코드의 선불권을 찾을 수 없습니다.')
    }
  }

  const deleteCoupon = async (couponId: string) => {
    if (!confirm('정말로 이 선불권을 삭제하시겠습니까?')) {
      return
    }

    try {
      const updatedCoupons = coupons.filter(coupon => coupon.id !== couponId)
      const saveResult = await CouponUtils.saveCouponsToJson(updatedCoupons)
      
      if (saveResult) {
        alert('선불권이 삭제되었습니다.')
        await loadCoupons()
      } else {
        alert('선불권 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('선불권 삭제 오류:', error)
      alert('선불권 삭제에 실패했습니다.')
    }
  }

  // 필터링된 선불권 목록
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = !searchCode.trim() || 
      coupon.code.toLowerCase().includes(searchCode.toLowerCase())
    
    // 사용한 쿠폰 토글이 꺼져있으면 사용 가능한 쿠폰만 표시
    const matchesUsedToggle = showUsedCoupons || (!coupon.isUsed && coupon.balance > 0)
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'available' && !coupon.isUsed && coupon.balance > 0) ||
      (filterType === 'used' && (coupon.isUsed || coupon.balance === 0))
    
    return matchesSearch && matchesUsedToggle && matchesFilter
  })

  const getStatusDisplay = (coupon: Coupon) => {
    if (coupon.isUsed || coupon.balance === 0) {
      return { text: '사용됨', style: 'bg-red-100 text-red-800' }
    } else if (coupon.balance < coupon.amount) {
      return { text: '부분 사용됨', style: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { text: '사용 가능', style: 'bg-green-100 text-green-800' }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">선불권 관리</h1>
        <div className="text-sm text-gray-600">
          총 {coupons.length}개 | 
          사용 가능: {coupons.filter(c => !c.isUsed && c.balance > 0).length}개 | 
          부분 사용: {coupons.filter(c => !c.isUsed && c.balance < c.amount && c.balance > 0).length}개 | 
          사용됨: {coupons.filter(c => c.isUsed || c.balance === 0).length}개
        </div>
      </div>

      {/* 선불권 생성 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">새 선불권 생성</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">선불권 이름/코드</label>
            <input
              type="text"
              value={newCouponName}
              onChange={(e) => setNewCouponName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="선불권 이름 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">금액 (원)</label>
            <input
              type="number"
              value={newCouponAmount || ''}
              onChange={(e) => setNewCouponAmount(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="선불권 금액 입력"
              min="0"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={createCoupon}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              선불권 생성
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">선불권 검색</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md"
                placeholder="선불권 코드로 검색"
              />
              <button
                onClick={searchCoupon}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                검색
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">필터</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="all">전체</option>
              <option value="available">사용 가능</option>
              <option value="used">사용됨</option>
            </select>
          </div>
        </div>
      </div>

      {/* 선불권 목록 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">선불권 목록</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={showUsedCoupons}
                onChange={(e) => setShowUsedCoupons(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              사용한 쿠폰도 표시
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 text-center">로딩 중...</div>
          ) : filteredCoupons.length === 0 ? (
            <div className="p-6 text-center text-gray-500">조건에 맞는 선불권이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    코드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    초기 금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    남은 잔액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCoupons.map((coupon) => {
                  const status = getStatusDisplay(coupon)
                  return (
                    <tr key={coupon.id} className={coupon.isUsed || coupon.balance === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {coupon.amount.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {coupon.balance.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.style}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(coupon.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deleteCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
} 