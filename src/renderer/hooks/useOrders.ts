import { useState, useEffect } from 'react'
import { Order, OrderItem } from '@/shared/types/order'
import { printOrder } from '@/shared/utils/printer'
import { DataService } from '@/firebase/dataService'
import { useAuth } from '@/firebase/AuthContext'

export const useOrders = (isPrinterConnected: boolean) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [showCompletedOrders, setShowCompletedOrders] = useState<boolean>(false)
  const { token } = useAuth()

  // 오늘 날짜인지 확인하는 함수
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString)
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  // 날짜를 "YYYY-MM-DD" 형식으로 변환하는 함수
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 주문번호 생성 함수
  const generateOrderId = (): string => {
    const now = new Date()
    const dateString = formatDate(now)
    
    // 오늘 생성된 주문 수를 세서 다음 번호 생성
    const todayOrders = orders.filter(order => isToday(order.orderDate))
    const todayOrderNumbers = todayOrders
      .map(order => {
        const parts = order.id.split('-')
        return parts.length === 4 ? parseInt(parts[3]) : 0
      })
      .filter(num => !isNaN(num))
    
    // 가장 큰 번호 찾기
    const maxNumber = todayOrderNumbers.length > 0 
      ? Math.max(...todayOrderNumbers) 
      : 0
    
    // 다음 번호
    const nextNumber = maxNumber + 1
    // 4자리 숫자로 패딩
    const paddedNumber = String(nextNumber).padStart(4, '0')
    
    return `${dateString}-${paddedNumber}`
  }

  useEffect(() => {
    loadOrdersData()
  }, [token])

  const loadOrdersData = async () => {
    try {
      // 구글 시트 또는 파일에서 주문 데이터 로드
      const allOrders = await DataService.loadData('orders', token || undefined) as Order[]
      
      // 상태별로 분류 후 저장
      const pendingOrders = allOrders.filter(order => order.status === 'pending')
      const completedOrders = allOrders.filter(order => order.status === 'completed')
      const cancelledOrders = allOrders.filter(order => order.status === 'cancelled')
      
      setOrders([...pendingOrders, ...completedOrders, ...cancelledOrders])
    } catch (error) {
      console.error('주문 데이터 로딩 실패:', error)
        setOrders([])
      }
  }

  // 주문 저장 헬퍼 함수
  const saveOrders = async (updatedOrders: Order[]) => {
    try {
      await DataService.saveData('orders', updatedOrders, token || undefined)
    } catch (error) {
      console.error('주문 데이터 저장 실패:', error)
      throw error
    }
  }

  const handleCreateOrder = async (orderItems: OrderItem[], memo: string, hasSoldOutItems: boolean) => {
    try {
      if (orderItems.length === 0) {
        alert('주문 항목을 선택해주세요.')
        return null
      }

      // 품절된 메뉴가 있는 경우 주문 불가 알림
      if (hasSoldOutItems) {
        alert('품절된 메뉴가 포함되어 있어 주문할 수 없습니다. 품절된 메뉴를 제거해주세요.')
        return null
      }

      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.menuItem.price * item.quantity,
        0
      )

      const order: Order = {
        id: generateOrderId(),
        items: orderItems,
        totalAmount,
        orderDate: new Date().toISOString(),
        memo: memo || undefined,
        status: 'pending',
        printed: false
      }

      // 주문 저장
      const updatedOrders = [...orders, order]
      setOrders(updatedOrders)
      await saveOrders(updatedOrders)

      // 프린터가 연결된 경우 주문서 출력
      if (isPrinterConnected) {
        try {
          await printOrder(order)
          const updatedOrder = { ...order, printed: true }
          const ordersWithPrintedStatus = orders.map(o => o.id === order.id ? updatedOrder : o)
          setOrders(ordersWithPrintedStatus)
          await saveOrders(ordersWithPrintedStatus)
        } catch (error) {
          console.error('주문서 출력 실패:', error)
          alert('주문서 출력에 실패했습니다.')
        }
      }

      return order
    } catch (error) {
      console.error('주문 등록 실패:', error)
      alert('주문 등록에 실패했습니다.')
      return null
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    try {
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status: 'completed' as const, completedAt: new Date().toISOString() }
        : order
    )
    setOrders(updatedOrders)
      await saveOrders(updatedOrders)
    } catch (error) {
      console.error('주문 완료 처리 실패:', error)
      alert('주문 완료 처리에 실패했습니다.')
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status: 'cancelled' as const }
        : order
    )
    setOrders(updatedOrders)
      await saveOrders(updatedOrders)
    } catch (error) {
      console.error('주문 취소 처리 실패:', error)
      alert('주문 취소 처리에 실패했습니다.')
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
    const updatedOrders = orders.filter(order => order.id !== orderId)
    setOrders(updatedOrders)
      await saveOrders(updatedOrders)
    } catch (error) {
      console.error('주문 삭제 처리 실패:', error)
      alert('주문 삭제 처리에 실패했습니다.')
    }
  }

  const getPendingOrders = () => {
    return orders.filter(order => order.status === 'pending' && isToday(order.orderDate))
  }

  const getCompletedOrders = () => {
    return orders.filter(order => 
      (order.status === 'completed' || order.status === 'cancelled') && 
      isToday(order.status === 'completed' && order.completedAt ? order.completedAt : order.orderDate)
    ).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
  }

  return {
    orders,
    showCompletedOrders,
    setShowCompletedOrders,
    handleCreateOrder,
    handleCompleteOrder,
    handleCancelOrder,
    handleDeleteOrder,
    getPendingOrders,
    getCompletedOrders,
    isToday
  }
} 