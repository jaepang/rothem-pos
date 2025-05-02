export interface Coupon {
  id: string
  code: string
  amount: number  // 초기 금액
  balance: number // 남은 잔액
  isUsed: boolean
  createdAt: string
  usedAt?: string
  userId?: string
  // 선결제한 사용자 정보
  createdBy: {
    id: string
    name: string
  }
  // 사용한 사용자 정보 (사용했을 경우)
  usedBy?: {
    id: string
    name: string
  }
} 