import { Coupon } from '@/shared/types/coupon'

export interface CouponOperationResult {
  success: boolean
  message: string
  data?: Coupon | Coupon[]
}

// UUID 대신 사용할 간단한 ID 생성 함수
const generateId = (): string => {
  return `coupon-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// 선불권 데이터 로드
export const loadCouponsFromJson = async (): Promise<Coupon[]> => {
  try {
    const coupons = await window.electronAPI.coupon.loadCouponsFromJson();
    
    // balance 필드 검증 및 보완
    return coupons.map(coupon => {
      // balance가 없거나 null인 경우 amount 값으로 초기화
      if (coupon.balance === undefined || coupon.balance === null) {
        return {
          ...coupon,
          balance: coupon.amount
        };
      }
      return coupon;
    });
  } catch (error) {
    console.error('선불권 데이터 로드 실패:', error);
    return [];
  }
}

// 선불권 데이터 저장
export const saveCouponsToJson = async (coupons: Coupon[]): Promise<boolean> => {
  try {
    // 저장 전에 모든 쿠폰의 balance 필드 확인
    const validatedCoupons = coupons.map(coupon => {
      // balance가 없거나 null이면 amount로 설정
      if (coupon.balance === undefined || coupon.balance === null) {
        return {
          ...coupon,
          balance: Number(coupon.amount)
        };
      }
      // balance가 숫자형이 아니면 숫자로 변환
      if (typeof coupon.balance !== 'number') {
        return {
          ...coupon,
          balance: Number(coupon.balance)
        };
      }
      return coupon;
    });

    await window.electronAPI.coupon.saveCouponsToJson(validatedCoupons);
    return true;
  } catch (error) {
    console.error('선불권 데이터 저장 실패:', error);
    return false;
  }
}

// 새 선불권 생성
export const createCoupon = async (
  coupons: Coupon[],
  name: string,
  amount: number, 
  userId: string,
  userName: string
): Promise<CouponOperationResult> => {
  if (!name.trim()) {
    return {
      success: false,
      message: '선불권 이름은 필수입니다.'
    }
  }

  if (amount <= 0) {
    return {
      success: false,
      message: '선불권 금액은 0보다 커야 합니다.'
    }
  }

  const newCoupon: Coupon = {
    id: generateId(),
    code: name.trim(),
    amount: Number(amount),
    balance: Number(amount), // 확실히 숫자 타입으로 변환
    isUsed: false,
    createdAt: new Date().toISOString(),
    createdBy: {
      id: userId,
      name: userName
    }
  }

  // 선불권 추가
  const updatedCoupons = [...coupons, newCoupon]
  const saveResult = await saveCouponsToJson(updatedCoupons)

  if (saveResult) {
    return {
      success: true,
      message: '선불권이 생성되었습니다.',
      data: newCoupon
    }
  } else {
    return {
      success: false,
      message: '선불권 저장 중 오류가 발생했습니다.'
    }
  }
}

// 선불권 사용 처리 (금액만큼 차감)
export const useCoupon = async (
  coupons: Coupon[],
  couponId: string,
  amount: number,
  userId: string,
  userName: string
): Promise<CouponOperationResult> => {
  const couponIndex = coupons.findIndex(c => c.id === couponId && !c.isUsed && c.balance > 0)
  
  if (couponIndex === -1) {
    return {
      success: false,
      message: '유효한 선불권을 찾을 수 없습니다.'
    }
  }

  const coupon = coupons[couponIndex]
  if (amount > coupon.balance) {
    return {
      success: false,
      message: '선불권 잔액이 부족합니다.'
    }
  }

  const updatedCoupons = [...coupons]
  const newBalance = coupon.balance - amount
  
  updatedCoupons[couponIndex] = {
    ...updatedCoupons[couponIndex],
    balance: newBalance,
    // 잔액이 0이면 완전히 사용됨으로 처리
    isUsed: newBalance === 0,
    // 잔액이 0일 때만 usedAt과 usedBy 정보 추가
    ...(newBalance === 0 && {
      usedAt: new Date().toISOString(),
      usedBy: {
        id: userId,
        name: userName
      }
    })
  }

  const saveResult = await saveCouponsToJson(updatedCoupons)

  if (saveResult) {
    return {
      success: true,
      message: `선불권에서 ${amount.toLocaleString()}원이 차감되었습니다. (남은 잔액: ${newBalance.toLocaleString()}원)`,
      data: updatedCoupons[couponIndex]
    }
  } else {
    return {
      success: false,
      message: '선불권 사용 처리 중 오류가 발생했습니다.'
    }
  }
}

// 여러 선불권 사용 처리 (복잡한 로직으로 여러 선불권에서 차감)
export const useMultipleCoupons = async (
  coupons: Coupon[],
  couponIds: string[],
  totalAmount: number,
  userId: string,
  userName: string
): Promise<CouponOperationResult> => {
  if (couponIds.length === 0) {
    return {
      success: false,
      message: '사용할 선불권이 선택되지 않았습니다.'
    }
  }

  // 선택된 선불권만 필터링 (유효한 선불권)
  const selectedCoupons = coupons
    .filter(c => couponIds.includes(c.id) && !c.isUsed && c.balance > 0)
    .sort((a, b) => a.balance - b.balance) // 잔액이 적은 순으로 정렬 (잔액 소진을 우선시)
  
  if (selectedCoupons.length === 0) {
    return {
      success: false,
      message: '사용 가능한 선불권을 찾을 수 없습니다.'
    }
  }

  // 선택된 선불권들의 총 잔액
  const totalBalance = selectedCoupons.reduce((sum, coupon) => sum + coupon.balance, 0)
  
  if (totalBalance < totalAmount) {
    return {
      success: false,
      message: '선불권 잔액이 부족합니다. 총 주문 금액보다 선불권 잔액이 더 많아야 합니다.'
    }
  }

  const updatedCoupons = [...coupons]
  const usedCoupons: Coupon[] = []
  let remainingAmount = totalAmount
  
  // 각 선불권에서 필요한 만큼 차감
  for (const couponId of couponIds) {
    if (remainingAmount <= 0) break // 더 이상 차감할 금액이 없음
    
    const couponIndex = updatedCoupons.findIndex(c => c.id === couponId && !c.isUsed && c.balance > 0)
    if (couponIndex === -1) continue // 유효하지 않은 선불권은 건너뜀
    
    const coupon = updatedCoupons[couponIndex]
    const amountToDeduct = Math.min(remainingAmount, coupon.balance)
    const newBalance = coupon.balance - amountToDeduct
    
    updatedCoupons[couponIndex] = {
      ...updatedCoupons[couponIndex],
      balance: newBalance,
      isUsed: newBalance === 0,
      ...(newBalance === 0 && {
        usedAt: new Date().toISOString(),
        usedBy: {
          id: userId,
          name: userName
        }
      })
    }
    
    usedCoupons.push(updatedCoupons[couponIndex])
    remainingAmount -= amountToDeduct
  }
  
  if (remainingAmount > 0) {
    return {
      success: false,
      message: '선불권에서 차감에 실패했습니다. 내부 오류가 발생했습니다.'
    }
  }

  const saveResult = await saveCouponsToJson(updatedCoupons)

  if (saveResult) {
    return {
      success: true,
      message: `${totalAmount.toLocaleString()}원이 선불권에서 차감되었습니다.`,
      data: usedCoupons
    }
  } else {
    return {
      success: false,
      message: '선불권 사용 처리 중 오류가 발생했습니다.'
    }
  }
}

// 선불권 사용 취소 (특정 금액 환불)
export const refundCouponAmount = async (
  coupons: Coupon[],
  couponId: string,
  amount: number
): Promise<CouponOperationResult> => {
  const couponIndex = coupons.findIndex(c => c.id === couponId)
  
  if (couponIndex === -1) {
    return {
      success: false,
      message: '환불할 선불권을 찾을 수 없습니다.'
    }
  }

  const coupon = coupons[couponIndex]
  const newBalance = coupon.balance + amount
  
  // 원래 금액보다 많이 환불하지 않도록 체크
  if (newBalance > coupon.amount) {
    return {
      success: false,
      message: '환불 금액이 원래 금액보다 많습니다.'
    }
  }

  const updatedCoupons = [...coupons]
  updatedCoupons[couponIndex] = {
    ...updatedCoupons[couponIndex],
    balance: newBalance,
    isUsed: false, // 환불 시 무조건 사용 가능 상태로 변경
    // 완전히 소진된 선불권을 환불했다면 사용자 정보 초기화
    ...((coupon.balance === 0 || coupon.isUsed) && {
      usedAt: undefined,
      usedBy: undefined
    })
  }

  const saveResult = await saveCouponsToJson(updatedCoupons)

  if (saveResult) {
    return {
      success: true,
      message: `선불권에 ${amount.toLocaleString()}원이 환불되었습니다. (현재 잔액: ${newBalance.toLocaleString()}원)`,
      data: updatedCoupons[couponIndex]
    }
  } else {
    return {
      success: false,
      message: '선불권 환불 처리 중 오류가 발생했습니다.'
    }
  }
} 