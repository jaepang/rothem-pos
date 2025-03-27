import React, { useEffect, useState } from 'react'
import { MenuItem, MenuList } from '@/shared/types/menu'
import { Order, OrderItem } from '@/shared/types/order'
import { loadMenuFromJson } from '@/shared/utils/menu'
import { initializePrinter, getPrinterStatus, printOrder } from '@/shared/utils/printer'
import { saveOrder, getOrders } from '@/shared/utils/order'

const OrderManagement: React.FC = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [memo, setMemo] = useState<string>('')
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [showOrderList, setShowOrderList] = useState<boolean>(false)

  useEffect(() => {
    const loadMenus = async () => {
      const loadedMenus = await loadMenuFromJson()
      setMenus(loadedMenus)
    }

    const initPrinter = async () => {
      await initializePrinter()
      const status = await getPrinterStatus()
      setIsPrinterConnected(status)
    }

    const loadOrders = () => {
      const savedOrders = getOrders()
      setOrders(savedOrders)
    }

    loadMenus()
    initPrinter()
    loadOrders()
  }, [])

  const categories = ['전체', ...new Set(menus.map(menu => menu.category))]
  const filteredMenus = selectedCategory === '전체'
    ? menus
    : menus.filter(menu => menu.category === selectedCategory)

  const displayMenus = filteredMenus.map(menu => {
    if (menu.category === '음료') {
      const variants = []
      if (menu.isHot) {
        variants.push({
          ...menu,
          displayName: `${menu.name} (HOT)`,
          name: menu.name,
          price: Number(menu.hotPrice || menu.price),
          isHot: true,
          isIce: false
        })
      }
      if (menu.isIce) {
        variants.push({
          ...menu,
          displayName: `${menu.name} (ICE)`,
          name: menu.name,
          price: Number(menu.icePrice || menu.price),
          isHot: false,
          isIce: true
        })
      }
      return variants
    }
    return [{
      ...menu,
      displayName: menu.name
    }]
  }).flat()

  const handleAddItem = (menu: MenuItem) => {
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

      const order: Order = {
        id: Date.now().toString(),
        items: orderItems,
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

      // 주문 초기화
      setOrderItems([])
      setMemo('')
      alert('주문이 등록되었습니다.')
    } catch (error) {
      console.error('주문 등록 실패:', error)
      alert('주문 등록에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">주문 관리</h2>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h3 className="text-xl font-bold mb-4">메뉴</h3>
          <div className="grid grid-cols-2 gap-3">
            {displayMenus.map(menu => (
              <button
                key={`${menu.id}-${menu.isHot}-${menu.isIce}`}
                className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                onClick={() => handleAddItem(menu)}
              >
                <div className="font-bold">{menu.displayName}</div>
                <div className="text-gray-600">{menu.price.toLocaleString()}원</div>
              </button>
            ))}
          </div>

          <div className="mt-6 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">주문 내역</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                메모
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3 mb-6">
              {orderItems.map(item => (
                <div
                  key={`${item.menuItem.id}-${item.menuItem.isHot}-${item.menuItem.isIce}`}
                  className="flex items-center justify-between p-3 bg-white border rounded-lg"
                >
                  <div>
                    <div className="font-bold">{item.menuItem.displayName}</div>
                    <div className="text-gray-600">
                      {(item.menuItem.price * item.quantity).toLocaleString()}원
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
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
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                      onClick={() =>
                        handleUpdateQuantity(
                          item.menuItem.id,
                          item.menuItem.isIce,
                          item.menuItem.isHot,
                          item.quantity + 1
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="text-xl font-bold mb-4">
                합계: {orderItems
                  .reduce(
                    (sum, item) => sum + item.menuItem.price * item.quantity,
                    0
                  )
                  .toLocaleString()}원
              </div>
              <button
                className="w-full py-3 rounded-lg text-lg font-medium bg-blue-500 text-white hover:bg-blue-600"
                onClick={handleCreateOrder}
              >
                주문하기
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">처리중인 주문</h3>
          <div className="space-y-2">
            {orders
              .filter(order => order.status === 'pending')
              .slice(0, 5)
              .map(order => (
              <div
                key={order.id}
                className="p-3 rounded-lg border bg-white"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="text-sm px-2 py-0.5 rounded bg-yellow-100">
                        처리중
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {new Date(order.orderDate).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={`${order.id}-${idx}`} className="text-sm flex justify-between">
                          <span>{item.menuItem.displayName} × {item.quantity}</span>
                          <span className="text-gray-600">{(item.menuItem.price * item.quantity).toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                    {order.memo && (
                      <div className="mt-2 text-sm text-gray-600">
                        메모: {order.memo}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 font-medium">
                    {order.totalAmount.toLocaleString()}원
                  </div>
                </div>
              </div>
            ))}
            {orders.filter(order => order.status === 'pending').length > 5 && (
              <button
                className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-800"
                onClick={() => setShowOrderList(true)}
              >
                전체 주문 목록 보기
              </button>
            )}
            {orders.filter(order => order.status === 'pending').length === 0 && (
              <div className="text-center py-4 text-gray-500">
                처리중인 주문이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { OrderManagement }