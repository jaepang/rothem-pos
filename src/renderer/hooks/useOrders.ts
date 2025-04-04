import { useState, useEffect } from 'react'
import { Order, OrderItem } from '@/shared/types/order'
import { saveOrder, getOrders, loadOrdersFromFile, saveOrdersToFile } from '@/shared/utils/order'
import { printOrder } from '@/shared/utils/printer'

export const useOrders = (isPrinterConnected: boolean) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [showCompletedOrders, setShowCompletedOrders] = useState<boolean>(false)

  // 오늘 날짜인지 확인하는 함수
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString)
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  useEffect(() => {
    loadOrdersData()
  }, [])

  const loadOrdersData = async () => {
    try {
      // 파일 기반 주문 데이터 로드
      const allOrders = await loadOrdersFromFile()
      const pendingOrders = allOrders.filter(order => order.status === 'pending')
      const completedOrders = allOrders.filter(order => order.status === 'completed')
      const cancelledOrders = allOrders.filter(order => order.status === 'cancelled')
      setOrders([...pendingOrders, ...completedOrders, ...cancelledOrders])
    } catch (error) {
      console.error('주문 데이터 로딩 실패:', error)
      // 폴백으로 이전 방식 사용
      try {
        const pendingOrders = await getOrders('pending')
        const completedOrders = await getOrders('completed')
        const cancelledOrders = await getOrders('cancelled')
        setOrders([...pendingOrders, ...completedOrders, ...cancelledOrders])
      } catch (fallbackError) {
        console.error('주문 데이터 폴백 로딩 실패:', fallbackError)
        setOrders([])
      }
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
        id: Date.now().toString(),
        items: orderItems,  // 품절 필터링 없이 그대로 사용
        totalAmount,
        orderDate: new Date().toISOString(),
        memo: memo || undefined,
        status: 'pending',
        printed: false
      }

      // 주문 저장
      saveOrder(order)
      setOrders(prevOrders => [...prevOrders, order])

      // 프린터가 연결된 경우 주문서 출력
      if (isPrinterConnected) {
        try {
          await printOrder(order)
          const updatedOrder = { ...order, printed: true }
          setOrders(prevOrders => 
            prevOrders.map(o => o.id === order.id ? updatedOrder : o)
          )
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

  const handleCompleteOrder = (orderId: string) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status: 'completed' as const, completedAt: new Date().toISOString() }
        : order
    )
    setOrders(updatedOrders)
    updatedOrders.forEach(order => saveOrder(order))
  }

  const handleCancelOrder = (orderId: string) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status: 'cancelled' as const }
        : order
    )
    setOrders(updatedOrders)
    updatedOrders.forEach(order => saveOrder(order))
  }

  const handleDeleteOrder = (orderId: string) => {
    const updatedOrders = orders.filter(order => order.id !== orderId)
    setOrders(updatedOrders)
    updatedOrders.forEach(order => saveOrder(order))
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