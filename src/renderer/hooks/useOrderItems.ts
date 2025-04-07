import { useState, useEffect, useRef } from 'react'
import { MenuItem } from '@/shared/types/menu'
import { OrderItem } from '@/shared/types/order'

// localStorage 키 상수
const ORDER_ITEMS_STORAGE_KEY = 'orderItems'
const ORDER_MEMO_STORAGE_KEY = 'orderMemo'

export const useOrderItems = (getOriginalId: (id: string) => string, menus: MenuItem[]) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [memo, setMemo] = useState<string>('')
  const initialized = useRef(false)

  // localStorage에 orderItems 저장
  const saveOrderItemsToStorage = (items: OrderItem[]) => {
    try {
      localStorage.setItem(ORDER_ITEMS_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('주문 목록 저장 실패:', error)
    }
  }

  // localStorage에서 orderItems 복원
  const loadOrderItemsFromStorage = (): OrderItem[] => {
    try {
      const storedItems = localStorage.getItem(ORDER_ITEMS_STORAGE_KEY)
      if (!storedItems) return []
      return JSON.parse(storedItems)
    } catch (error) {
      console.error('주문 목록 불러오기 실패:', error)
      return []
    }
  }

  // localStorage에서 orderItems 제거
  const clearOrderItemsFromStorage = () => {
    try {
      localStorage.removeItem(ORDER_ITEMS_STORAGE_KEY)
      localStorage.removeItem(ORDER_MEMO_STORAGE_KEY)
    } catch (error) {
      console.error('주문 정보 삭제 실패:', error)
    }
  }

  // localStorage에 메모 저장
  const saveMemoToStorage = (memoText: string) => {
    try {
      if (memoText) {
        localStorage.setItem(ORDER_MEMO_STORAGE_KEY, memoText)
      } else {
        localStorage.removeItem(ORDER_MEMO_STORAGE_KEY)
      }
    } catch (error) {
      console.error('메모 저장 실패:', error)
    }
  }

  // localStorage에서 메모 복원
  const loadMemoFromStorage = (): string => {
    try {
      return localStorage.getItem(ORDER_MEMO_STORAGE_KEY) || ''
    } catch (error) {
      console.error('메모 불러오기 실패:', error)
      return ''
    }
  }

  // 최초 마운트 시에만 실행되는 useEffect (데이터 로딩용)
  useEffect(() => {
    if (initialized.current) return
    
    // 컴포넌트가 마운트될 때 localStorage에서 orderItems 복원
    const storedOrderItems = loadOrderItemsFromStorage()
    const storedMemo = loadMemoFromStorage()
    
    // 이전에 로드된 항목이 있는 경우에만 처리
    if (storedOrderItems.length > 0) {
      clearOrderItemsFromStorage()
      
      // 품절된 메뉴를 필터링하지 않고 그대로 복원
      setOrderItems(storedOrderItems)
      
      // 품절된 메뉴 확인 (정보 제공용)
      if (menus && menus.length > 0) {
        const soldOutItems = storedOrderItems.filter(item => {
          const originalId = getOriginalId(item.menuItem.id)
          const currentMenu = menus.find(menu => menu.id === originalId)
          return currentMenu && currentMenu.isSoldOut
        })
        
        // 품절된 메뉴가 있으면 사용자에게 알림만 제공
        if (soldOutItems.length > 0) {
          const soldOutNames = soldOutItems.map(item => item.menuItem.displayName).join(', ')
          setTimeout(() => {
            alert(`주문 목록에 품절된 메뉴(${soldOutNames})가 포함되어 있습니다. 주문 시 해당 메뉴를 제거해주세요.`)
          }, 500)
        }
      }
    }
    
    // 메모도 복원
    if (storedMemo) {
      setMemo(storedMemo)
    }
    
    initialized.current = true
  }, [menus, getOriginalId])

  // orderItems 저장을 관리하는 함수
  const saveOrderItems = (items: OrderItem[]) => {
    if (items.length > 0) {
      saveOrderItemsToStorage(items)
    } else {
      localStorage.removeItem(ORDER_ITEMS_STORAGE_KEY)
    }
  }

  // memo 저장을 관리하는 함수
  const saveMemo = (memoText: string) => {
    if (memoText) {
      saveMemoToStorage(memoText)
    } else {
      localStorage.removeItem(ORDER_MEMO_STORAGE_KEY)
    }
  }

  const handleAddItem = (menu: MenuItem) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => 
        item.menuItem.id === menu.id && 
        item.menuItem.isIce === menu.isIce && 
        item.menuItem.isHot === menu.isHot
      )
      
      const newItems = existingItem
        ? prev.map(item =>
            item.menuItem.id === menu.id && 
            item.menuItem.isIce === menu.isIce && 
            item.menuItem.isHot === menu.isHot
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...prev, { menuItem: menu, quantity: 1 }]
      
      // 상태 업데이트 후 로컬 스토리지 저장 (초기화 이후에만)
      if (initialized.current) {
        saveOrderItems(newItems)
      }
      
      return newItems
    })
  }

  const handleUpdateQuantity = (itemId: string, isIce: boolean | undefined, isHot: boolean | undefined, newQuantity: number) => {
    if (newQuantity < 0) return
    
    setOrderItems(prev => {
      const newItems = newQuantity === 0
        ? prev.filter(item => 
            !(item.menuItem.id === itemId && 
              item.menuItem.isIce === isIce && 
              item.menuItem.isHot === isHot)
          )
        : prev.map(item =>
            item.menuItem.id === itemId && 
            item.menuItem.isIce === isIce && 
            item.menuItem.isHot === isHot
              ? { ...item, quantity: newQuantity }
              : item
          )
      
      // 상태 업데이트 후 로컬 스토리지 저장 (초기화 이후에만)
      if (initialized.current) {
        saveOrderItems(newItems)
      }
      
      return newItems
    })
  }

  const hasSoldOutItems = () => {
    return orderItems.some(item => {
      const originalId = getOriginalId(item.menuItem.id)
      const currentMenu = menus.find(menu => menu.id === originalId)
      return currentMenu && currentMenu.isSoldOut
    })
  }

  const getTotalAmount = () => {
    return orderItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    )
  }

  const clearOrderItems = () => {
    setOrderItems([])
    setMemo('')
    clearOrderItemsFromStorage()
  }

  // memo 변경 처리를 위한 함수
  const handleMemoChange = (newMemo: string) => {
    setMemo(newMemo)
    if (initialized.current) {
      saveMemo(newMemo)
    }
  }

  return {
    orderItems,
    setOrderItems,
    memo,
    setMemo: handleMemoChange,
    handleAddItem,
    handleUpdateQuantity,
    hasSoldOutItems,
    getTotalAmount,
    clearOrderItems,
    clearOrderItemsFromStorage
  }
} 