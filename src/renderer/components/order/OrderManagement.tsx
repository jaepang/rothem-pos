import React, { useEffect, useState } from 'react'
import { MenuItem, MenuList } from '@/shared/types/menu'
import { Order, OrderItem } from '@/shared/types/order'
import { loadMenuFromJson, saveMenuToJson } from '@/shared/utils/menu'
import { initializePrinter, getPrinterStatus, printOrder } from '@/shared/utils/printer'
import { saveOrder, getOrders, ORDERS_STORAGE_KEY } from '@/shared/utils/order'
import { OrderCard } from './OrderCard'
import { loadCategories } from '@/shared/utils/category'

// localStorage 키 상수
const ORDER_ITEMS_STORAGE_KEY = 'orderItems'
const ORDER_MEMO_STORAGE_KEY = 'orderMemo'

const OrderManagement: React.FC = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [memo, setMemo] = useState<string>('')
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [showCompletedOrders, setShowCompletedOrders] = useState<boolean>(false)
  // 순서 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  // 순서 변경을 위해 선택된 카드 인덱스
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  // 선택된 카드의 원본 ID (음료 변형 메뉴 하이라이트용)
  const [selectedOriginalId, setSelectedOriginalId] = useState<string | null>(null)

  // 원본 ID 추출 헬퍼 함수
  const getOriginalId = (menuId: string) => {
    if (typeof menuId === 'string' && (menuId.endsWith('-hot') || menuId.endsWith('-ice'))) {
      return menuId.substring(0, menuId.lastIndexOf('-'))
    }
    return menuId
  }

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

  // 오늘 날짜인지 확인하는 함수
  const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  useEffect(() => {
    const loadMenus = async () => {
      const loadedMenus = await loadMenuFromJson()
      
      // 메뉴 목록을 loadCategories에 전달하여 필요한 카테고리를 생성합니다
      await loadCategories(loadedMenus)
      
      // 불러온 메뉴에 order 필드 유무 확인
      const hasOrderField = loadedMenus.some(menu => 'order' in menu)
      
      // order 필드가 없는 경우 기존 로직으로 정렬 후 order 필드 추가
      if (!hasOrderField) {
        // 카테고리별 메뉴 수 계산
        const categoryCounts = loadedMenus.reduce((acc, menu) => {
          acc[menu.category] = (acc[menu.category] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // 카테고리를 메뉴 수 기준으로 정렬
        const sortedCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([category]) => category)
        
        // 정렬된 카테고리 순서대로 메뉴 정렬
        const sortedMenus = [...loadedMenus].sort((a, b) => {
          const aIndex = sortedCategories.indexOf(a.category)
          const bIndex = sortedCategories.indexOf(b.category)
          if (aIndex === bIndex) {
            return a.name.localeCompare(b.name)
          }
          return aIndex - bIndex
        })
        
        // 정렬된 메뉴에 order 필드 추가
        const menusWithOrder = sortedMenus.map((menu, index) => ({
          ...menu,
          order: index + 1
        }))
        
        // 메뉴 상태 업데이트
        setMenus(menusWithOrder)
        
        // 메뉴 정렬 정보를 JSON에 저장 (별도 작업으로 수행)
        try {
          await saveMenuToJson(menusWithOrder)
        } catch (error) {
          console.error('메뉴 순서 저장 실패:', error)
        }
      } else {
        // order 필드가 이미 있는 경우 해당 필드로 정렬
        const sortedMenus = [...loadedMenus].sort((a, b) => {
          return (a.order || 0) - (b.order || 0)
        })
        setMenus(sortedMenus)
      }
    }

    const initPrinter = async () => {
      await initializePrinter()
      const status = await getPrinterStatus()
      setIsPrinterConnected(status)
    }

    const loadOrders = () => {
      const pendingOrders = getOrders('pending')
      const completedOrders = getOrders('completed')
      const cancelledOrders = getOrders('cancelled')
      setOrders([...pendingOrders, ...completedOrders, ...cancelledOrders])
    }

    loadMenus()
    initPrinter()
    loadOrders()

    // 컴포넌트가 마운트될 때 localStorage에서 orderItems 복원
    const storedOrderItems = loadOrderItemsFromStorage()
    const storedMemo = loadMemoFromStorage()
    
    // localStorage에서 항목을 복원한 후 제거 (pop)
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
  }, [])

  // orderItems 변경 시 localStorage에 저장하는 useEffect 추가
  useEffect(() => {
    if (orderItems.length > 0) {
      saveOrderItemsToStorage(orderItems)
    } else {
      localStorage.removeItem(ORDER_ITEMS_STORAGE_KEY)
    }
  }, [orderItems])

  // memo 변경 시 localStorage에 저장하는 useEffect 추가
  useEffect(() => {
    if (memo) {
      saveMemoToStorage(memo)
    } else {
      localStorage.removeItem(ORDER_MEMO_STORAGE_KEY)
    }
  }, [memo])

  const categories = ['전체', ...new Set(menus.map(menu => menu.category))]
  const filteredMenus = selectedCategory === '전체'
    ? menus
    : menus.filter(menu => menu.category === selectedCategory)

  // order 필드로 메뉴 정렬
  const sortedMenus = [...filteredMenus].sort((a, b) => {
    return (a.order || 0) - (b.order || 0)
  })

  const displayMenus = sortedMenus.map(menu => {
    if (menu.category === '음료') {
      const variants = []
      if (menu.isHot) {
        variants.push({
          ...menu,
          displayName: `${menu.name} (HOT)`,
          name: menu.name,
          price: Number(menu.hotPrice || menu.price),
          isHot: true,
          isIce: false,
          id: `${menu.id}-hot`, // 고유한 ID 생성
          order: menu.order ? menu.order * 10 : 0 // 정렬을 위한 고유한 순서값 (원본 * 10)
        })
      }
      if (menu.isIce) {
        variants.push({
          ...menu,
          displayName: `${menu.name} (ICE)`,
          name: menu.name,
          price: Number(menu.icePrice || menu.price),
          isHot: false,
          isIce: true,
          id: `${menu.id}-ice`, // 고유한 ID 생성
          order: menu.order ? menu.order * 10 + 1 : 1 // 정렬을 위한 고유한 순서값 (원본 * 10 + 1)
        })
      }
      return variants
    }
    return [{
      ...menu,
      displayName: menu.name
    }]
  }).flat()

  // 순서 변경 함수를 수정하여 원본 메뉴와 변형 메뉴의 연관성 유지
  const handleOrderChange = (index: number) => {
    if (!isEditMode) return
    
    // 선택된 메뉴의 원본 ID 가져오기
    const selectedMenu = displayMenus[index]
    const origId = getOriginalId(selectedMenu.id)
    
    // 이미 선택된 카드를 다시 클릭한 경우 선택 해제
    if (selectedCardIndex === index || 
        (selectedOriginalId !== null && getOriginalId(selectedMenu.id) === selectedOriginalId)) {
      setSelectedCardIndex(null)
      setSelectedOriginalId(null)
      return
    }
    
    if (selectedCardIndex === null) {
      // 첫 번째 카드 선택
      setSelectedCardIndex(index)
      setSelectedOriginalId(origId) // 원본 ID 저장
    } else if (selectedCardIndex !== index) {
      // 두 번째 카드 선택 시 순서 교환
      const updatedMenus = [...menus]
      const firstMenu = displayMenus[selectedCardIndex]
      const secondMenu = displayMenus[index]
      
      // 원본 메뉴 찾기
      const firstOriginalId = getOriginalId(firstMenu.id)
      const secondOriginalId = getOriginalId(secondMenu.id)
      
      const firstMenuOriginalIndex = updatedMenus.findIndex(m => m.id === firstOriginalId)
      const secondMenuOriginalIndex = updatedMenus.findIndex(m => m.id === secondOriginalId)
      
      if (firstMenuOriginalIndex !== -1 && secondMenuOriginalIndex !== -1) {
        // 두 카드의 order 값 교환 (변형 고려)
        const firstOrder = updatedMenus[firstMenuOriginalIndex].order || 0
        const secondOrder = updatedMenus[secondMenuOriginalIndex].order || 0
        
        // 원본 메뉴 업데이트
        updatedMenus[firstMenuOriginalIndex] = {
          ...updatedMenus[firstMenuOriginalIndex],
          order: secondOrder
        }
        
        updatedMenus[secondMenuOriginalIndex] = {
          ...updatedMenus[secondMenuOriginalIndex],
          order: firstOrder
        }
        
        setMenus(updatedMenus)
      }
      
      // 선택 초기화
      setSelectedCardIndex(null)
      setSelectedOriginalId(null) // 원본 ID 초기화
    }
  }

  // 편집 모드 저장
  const handleSaveOrder = async () => {
    try {
      await saveMenuToJson(menus)
      setIsEditMode(false)
      setSelectedCardIndex(null)
      setSelectedOriginalId(null) // 원본 ID 초기화
      alert('메뉴 순서가 저장되었습니다.')
    } catch (error) {
      console.error('메뉴 순서 저장 실패:', error)
      alert('메뉴 순서 저장에 실패했습니다.')
    }
  }

  // 편집 모드 취소
  const handleCancelEdit = async () => {
    // 원래 메뉴 다시 불러오기
    const loadedMenus = await loadMenuFromJson()
    const sortedMenus = [...loadedMenus].sort((a, b) => {
      return (a.order || 0) - (b.order || 0)
    })
    setMenus(sortedMenus)
    setIsEditMode(false)
    setSelectedCardIndex(null)
    setSelectedOriginalId(null) // 원본 ID 초기화
  }

  const handleAddItem = (menu: MenuItem) => {
    if (isEditMode) return // 편집 모드에서는 주문 추가 방지
    
    setOrderItems(prev => {
      const existingItem = prev.find(item => 
        item.menuItem.id === menu.id && 
        item.menuItem.isIce === menu.isIce && 
        item.menuItem.isHot === menu.isHot
      )
      if (existingItem) {
        return prev.map(item =>
          item.menuItem.id === menu.id && 
          item.menuItem.isIce === menu.isIce && 
          item.menuItem.isHot === menu.isHot
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { menuItem: menu, quantity: 1 }]
    })
  }

  const handleUpdateQuantity = (itemId: string, isIce: boolean | undefined, isHot: boolean | undefined, newQuantity: number) => {
    if (newQuantity < 0) return
    setOrderItems(prev =>
      newQuantity === 0
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
    )
  }

  const handleCreateOrder = async () => {
    try {
      if (orderItems.length === 0) {
        alert('주문 항목을 선택해주세요.')
        return
      }

      // 품절된 메뉴 확인
      const soldOutItems = orderItems.filter(item => {
        const originalId = getOriginalId(item.menuItem.id)
        const currentMenu = menus.find(menu => menu.id === originalId)
        return currentMenu && currentMenu.isSoldOut
      })
      
      // 품절된 메뉴가 있는 경우 주문 불가 알림
      if (soldOutItems.length > 0) {
        const soldOutNames = soldOutItems.map(item => item.menuItem.displayName).join(', ')
        alert(`품절된 메뉴(${soldOutNames})가 포함되어 있어 주문할 수 없습니다. 품절된 메뉴를 제거해주세요.`)
        return
      }

      const order: Order = {
        id: Date.now().toString(),
        items: orderItems,  // 품절 필터링 없이 그대로 사용
        totalAmount: orderItems.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        ),
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

      // 주문 초기화 및 localStorage에서 orderItems 제거
      setOrderItems([])
      setMemo('')
      clearOrderItemsFromStorage()
    } catch (error) {
      console.error('주문 등록 실패:', error)
      alert('주문 등록에 실패했습니다.')
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

  return (
    <div className="h-[calc(94vh-0.1rem)] w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
      <div className={`${showCompletedOrders ? 'lg:col-span-6' : 'lg:col-span-9'} transition-all duration-300 overflow-hidden`}>
        <div className="h-full overflow-y-auto">
          <div className="space-y-6 pb-6">
            <div className="flex flex-col gap-4 pt-6">
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      disabled={isEditMode}
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                      } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <button
                        className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
                        onClick={handleCancelEdit}
                      >
                        취소
                      </button>
                      <button
                        className="px-3 py-1.5 text-sm rounded-md bg-green-500 text-white hover:bg-green-600"
                        onClick={handleSaveOrder}
                      >
                        저장
                      </button>
                    </>
                  ) : (
                    <button
                      className="px-3 py-1.5 text-sm rounded-md bg-violet-500 text-white hover:bg-violet-600"
                      onClick={() => {
                        // orderItems가 비어있지 않으면 초기화
                        if (orderItems.length > 0) {
                          setOrderItems([])
                          setMemo('')
                          clearOrderItemsFromStorage()
                        }
                        setIsEditMode(true)
                      }}
                    >
                      순서 편집
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className={`grid ${
                showCompletedOrders 
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              } gap-3`}>
                {displayMenus.map((menu, index) => {
                  const isSelected = orderItems.some(item => 
                    item.menuItem.id === menu.id && 
                    item.menuItem.isIce === menu.isIce && 
                    item.menuItem.isHot === menu.isHot
                  )
                  
                  const selectedItem = isSelected ? orderItems.find(item => 
                    item.menuItem.id === menu.id && 
                    item.menuItem.isIce === menu.isIce && 
                    item.menuItem.isHot === menu.isHot
                  ) : null

                  // 편집 모드에서 선택된 카드 표시 (메인 선택 또는 같은 원본 ID를 가진 변형)
                  const isCardSelected = isEditMode && (
                    selectedCardIndex === index || 
                    (selectedOriginalId !== null && getOriginalId(menu.id) === selectedOriginalId)
                  )
                  
                  return (
                    <button
                      key={`${menu.id}-${menu.isHot}-${menu.isIce}`}
                      className={`p-3 bg-white border rounded-lg shadow-sm 
                        ${menu.isSoldOut 
                          ? 'opacity-50 cursor-not-allowed border-red-300 bg-red-50' 
                          : isSelected && !isEditMode
                            ? 'border-blue-500 border-2 shadow-md bg-blue-50'
                            : isCardSelected
                              ? 'border-violet-500 border-2 shadow-md bg-violet-50'
                              : isEditMode
                                ? 'border-dashed border-gray-400 hover:border-violet-300'
                                : 'hover:shadow-md transition-shadow'}`}
                      onClick={() => isEditMode 
                        ? handleOrderChange(index) 
                        : !menu.isSoldOut && handleAddItem(menu)
                      }
                      disabled={!isEditMode && menu.isSoldOut}
                    >
                      <div className="font-bold text-left">
                        {menu.displayName}
                        {menu.isSoldOut && <span className="text-red-500 ml-1">(품절)</span>}
                        {isEditMode && <span className="text-gray-500 ml-1">#{menu.order || 0}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-gray-600">{menu.price.toLocaleString()}원</div>
                        {isSelected && selectedItem && !isEditMode && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full hover:bg-blue-200 text-blue-600 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateQuantity(
                                  menu.id,
                                  menu.isIce,
                                  menu.isHot,
                                  selectedItem.quantity - 1
                                )
                              }}
                            >
                              -
                            </div>
                            <span className="w-6 text-center text-blue-600 font-medium">{selectedItem.quantity}</span>
                            <div
                              className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full hover:bg-blue-200 text-blue-600 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateQuantity(
                                  menu.id,
                                  menu.isIce,
                                  menu.isHot,
                                  selectedItem.quantity + 1
                                )
                              }}
                              aria-disabled={menu.isSoldOut}
                              style={menu.isSoldOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              +
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

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
                            setOrderItems([])
                            setMemo('')
                            clearOrderItemsFromStorage()
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
                    onChange={e => setMemo(e.target.value)}
                    rows={1}
                  />
                </div>

                {orderItems.length > 0 && (
                  <div className="space-y-2 mb-2 max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {orderItems.map(item => {
                        // 현재 메뉴 품절 상태 확인
                        const originalId = getOriginalId(item.menuItem.id)
                        const currentMenu = menus.find(menu => menu.id === originalId)
                        const isSoldOut = currentMenu ? currentMenu.isSoldOut : false
                        
                        return (
                          <div
                            key={`${item.menuItem.id}-${item.menuItem.isHot}-${item.menuItem.isIce}`}
                            className={`flex items-center justify-between p-3 bg-white border rounded-lg ${
                              isSoldOut ? 'opacity-70 border-red-300 bg-red-50' : ''
                            }`}
                          >
                            <div className="font-medium truncate mr-4">
                              {item.menuItem.displayName}
                              {isSoldOut && <span className="text-red-500 ml-1">(품절)</span>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-gray-600">{item.menuItem.price.toLocaleString()}원</span>
                              <div
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.menuItem.id,
                                    item.menuItem.isIce,
                                    item.menuItem.isHot,
                                    item.quantity - 1
                                  )
                                }
                              >
                                -
                              </div>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <div
                                className="w-7 h-7 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 cursor-pointer"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.menuItem.id,
                                    item.menuItem.isIce,
                                    item.menuItem.isHot,
                                    item.quantity + 1
                                  )
                                }
                                aria-disabled={isSoldOut}
                                style={isSoldOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              >
                                +
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <div className="text-xl font-bold mb-3">
                    합계: {orderItems
                      .reduce(
                        (sum, item) => sum + item.menuItem.price * item.quantity,
                        0
                      )
                      .toLocaleString()}원
                  </div>
                  {/* 주문 목록에 품절된 메뉴가 있는지 확인 */}
                  {(() => {
                    const hasSoldOutItems = orderItems.some(item => {
                      const originalId = getOriginalId(item.menuItem.id)
                      const currentMenu = menus.find(menu => menu.id === originalId)
                      return currentMenu && currentMenu.isSoldOut
                    })
                    
                    return (
                      <button
                        className={`w-full py-3 rounded-lg text-lg font-medium ${
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
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="flex justify-between items-center pt-6 pb-4">
            <h2 className="text-3xl font-bold">처리중인 주문</h2>
            <button
              onClick={() => setShowCompletedOrders(!showCompletedOrders)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              상세보기
              <svg
                className={`w-4 h-4 transform transition-transform ${showCompletedOrders ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 pb-6">
            {orders
              .filter(order => order.status === 'pending' && isToday(order.orderDate))
              .map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onComplete={handleCompleteOrder}
                  onCancel={handleCancelOrder}
                />
              ))}
            {orders.filter(order => order.status === 'pending' && isToday(order.orderDate)).length === 0 && (
              <div className="text-center py-4 text-gray-500">
                처리중인 주문이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {showCompletedOrders && (
        <div className="lg:col-span-3 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="pt-6 pb-4">
              <h2 className="text-3xl font-bold">완료된 주문</h2>
            </div>
            <div className="space-y-2 pb-6">
              {orders
                .filter(order => 
                  (order.status === 'completed' || order.status === 'cancelled') && 
                  isToday(order.status === 'completed' && order.completedAt ? order.completedAt : order.orderDate)
                )
                .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
                .map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onComplete={handleCompleteOrder}
                    onCancel={handleCancelOrder}
                    onDelete={order.status === 'cancelled' ? handleDeleteOrder : undefined}
                  />
                ))}
              {orders.filter(order => 
                (order.status === 'completed' || order.status === 'cancelled') && 
                isToday(order.status === 'completed' && order.completedAt ? order.completedAt : order.orderDate)
              ).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  완료된 주문이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { OrderManagement }