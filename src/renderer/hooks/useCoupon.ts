import { useState, useEffect, useCallback } from 'react'
import { Coupon } from '@/shared/types/coupon'
import * as CouponUtils from '@/shared/utils/coupon'
import { DataService } from '@/firebase/dataService'
import { GoogleToken } from '@/firebase/auth'

interface User {
  id: string
  name: string
}

// 현재 사용자 정보 가져오기 (실제 코드에 맞게 변경 필요)
const getCurrentUser = (): User => {
  // 임시로 하드코딩된 사용자 정보 사용
  return {
    id: 'current-user',
    name: '현재 사용자'
  }
}

export const useCoupon = () => {
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [appliedCoupons, setAppliedCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 모든 선불권 데이터 로드
  const loadCoupons = useCallback(async () => {
    setIsLoading(true)
    try {
      const coupons = await CouponUtils.loadCouponsFromJson()
      // 사용 가능한 쿠폰만 필터링 (isUsed가 false인 것들)
      setAvailableCoupons(coupons.filter(coupon => !coupon.isUsed && coupon.balance > 0))
      setIsLoading(false)
    } catch (error) {
      console.error('선불권 데이터 로드 실패:', error)
      setIsLoading(false)
    }
  }, [])
  
  // 초기 데이터 로드
  useEffect(() => {
    loadCoupons()
  }, [loadCoupons])
  
  // 선불권 추가 (이름과 금액을 받음)
  const addCoupon = async (name: string, amount: number): Promise<boolean> => {
    try {
      const currentUser = getCurrentUser()
      
      // 모든 선불권 데이터 로드 (최신 데이터 가져오기)
      const allCoupons = await CouponUtils.loadCouponsFromJson()
      
      // 새 선불권 생성
      const result = await CouponUtils.createCoupon(
        allCoupons,
        name,
        amount,
        currentUser.id,
        currentUser.name
      )
      
      if (result.success) {
        // 데이터 다시 로드
        await loadCoupons()
        return true
      } else {
        alert(result.message)
        return false
      }
    } catch (error) {
      console.error('선불권 추가 실패:', error)
      return false
    }
  }
  
  // 선불권 적용
  const applyCoupon = async (couponIds: string[]): Promise<boolean> => {
    try {
      const selectedCoupons = availableCoupons.filter(coupon => 
        couponIds.includes(coupon.id) && !coupon.isUsed && coupon.balance > 0
      )
      
      if (selectedCoupons.length === 0) {
        alert('유효한 선불권이 없습니다.')
        return false
      }
      
      setAppliedCoupons(selectedCoupons)
      
      // 선택된 선불권을 가용 목록에서 제외
      setAvailableCoupons(prev => 
        prev.filter(coupon => !couponIds.includes(coupon.id))
      )
      
      return true
    } catch (error) {
      console.error('선불권 적용 실패:', error)
      return false
    }
  }
  
  // 적용된 모든 선불권 제거
  const removeAllCoupons = () => {
    if (appliedCoupons.length === 0) return;
    
    // 적용된 선불권을 다시 가용 목록으로 돌려놓음 (중복 제거)
    setAvailableCoupons(prev => {
      // 기존 available에서 id들을 추출
      const existingIds = new Set(prev.map(coupon => coupon.id));
      
      // appliedCoupons 중에서 existingIds에 없는 것들만 추가
      const couponsToAdd = appliedCoupons.filter(coupon => !existingIds.has(coupon.id));
      
      return [...prev, ...couponsToAdd];
    });
    
    setAppliedCoupons([]);
  }
  
  // 특정 선불권 제거
  const removeCoupon = (couponId: string) => {
    const couponToRemove = appliedCoupons.find(coupon => coupon.id === couponId);
    
    if (couponToRemove) {
      // 적용된 선불권 목록에서 제거
      setAppliedCoupons(prev => prev.filter(coupon => coupon.id !== couponId));
      
      // 가용 선불권 목록에 중복 없이 추가
      setAvailableCoupons(prev => {
        // 이미 같은 ID의 쿠폰이 있는지 확인
        const exists = prev.some(coupon => coupon.id === couponId);
        
        // 없는 경우에만 추가
        if (!exists) {
          return [...prev, couponToRemove];
        }
        return prev;
      });
    }
  }
  
  // 선불권 총 금액 계산
  const getTotalCouponAmount = (): number => {
    return appliedCoupons.reduce((sum, coupon) => sum + coupon.balance, 0)
  }
  
  // 선불권 사용 처리 (주문 결제 시)
  const useCoupons = async (totalAmount: number): Promise<boolean> => {
    if (appliedCoupons.length === 0) return false;
    
    try {
      const currentUser = getCurrentUser();
      
      // 현재 모든 선불권 데이터 가져오기
      const allCoupons = await CouponUtils.loadCouponsFromJson();
      
      // 여러 선불권 사용 처리
      const couponIds = appliedCoupons.map(coupon => coupon.id);
      const result = await CouponUtils.useMultipleCoupons(
        allCoupons,
        couponIds,
        totalAmount,
        currentUser.id,
        currentUser.name
      );
      
      if (result.success) {
        // 사용 완료 후 초기화
        setAppliedCoupons([]);
        // 데이터 다시 로드
        await loadCoupons();
        return true;
      } else {
        alert(result.message);
        return false;
      }
    } catch (error) {
      console.error('선불권 사용 처리 실패:', error);
      return false;
    }
  }
  
  // 구글 시트 동기화
  const syncWithGoogleSheet = async (): Promise<boolean> => {
    try {
      console.log('[useCoupon] 선불권 구글 시트 동기화 시작');
      const tokenString = localStorage.getItem('googleAuthToken')
      
      if (!tokenString) {
        console.error('[useCoupon] 구글 토큰이 없음');
        alert('구글 계정에 로그인되어 있지 않습니다.')
        return false
      }
      
      // 문자열을 객체로 변환
      const token: GoogleToken = JSON.parse(tokenString)
      console.log('[useCoupon] 토큰 확인:', token.accessToken.substring(0, 10) + '...');
      
      // DataService를 통해 쿠폰 데이터 동기화
      const coupons = await CouponUtils.loadCouponsFromJson()
      
      console.log(`[useCoupon] 선불권 데이터 동기화 준비 완료 (${coupons.length}개 항목)`);
      
      // 각 선불권의 balance 필드 확인
      coupons.forEach((coupon, index) => {
        console.log(`[useCoupon] 선불권 #${index+1} - ID: ${coupon.id}, 이름: ${coupon.code}, 잔액: ${coupon.balance}, 초기금액: ${coupon.amount}`);
        if (coupon.balance === undefined || coupon.balance === null) {
          console.warn(`[useCoupon] 경고: 선불권 #${index+1}의 balance 값이 없습니다`);
        }
      });
      
      const success = await DataService.syncToGoogleSheet('coupons', coupons, token)
      
      if (success) {
        console.log('[useCoupon] 선불권 구글 시트 동기화 성공');
        alert('선불권 데이터가 구글 시트에 성공적으로 동기화되었습니다.')
        return true
      } else {
        console.error('[useCoupon] 선불권 구글 시트 동기화 실패');
        alert('선불권 데이터 동기화 중 오류가 발생했습니다.')
        return false
      }
    } catch (error) {
      console.error('[useCoupon] 구글 시트 동기화 오류:', error)
      if (error instanceof Error) {
        alert(`구글 시트 동기화 오류: ${error.message}`)
      } else {
        alert('구글 시트 동기화 중 알 수 없는 오류가 발생했습니다.')
      }
      return false
    }
  }
  
  return {
    availableCoupons,
    appliedCoupons,
    isLoading,
    addCoupon,
    applyCoupon,
    removeAllCoupons,
    removeCoupon,
    useCoupons,
    getTotalCouponAmount,
    syncWithGoogleSheet,
    loadCoupons
  }
} 