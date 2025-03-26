import React, { useEffect, useState } from 'react'
import { MenuItem, MenuList } from '@/shared/types/menu'
import { Order, OrderItem } from '@/shared/types/order'
import { loadMenuFromJson } from '@/shared/utils/menu'
import { initializePrinter, getPrinterStatus, printOrder } from '@/shared/utils/printer'

const OrderManagement: React.FC = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [memo, setMemo] = useState<string>('')
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false)

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

    loadMenus()
    initPrinter()
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
      const existingItem = prev.find(item => item.menuItem.id === menu.id)
      if (existingItem) {
        return prev.map(item =>
          item.menuItem.id === menu.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { menuItem: menu, quantity: 1 }]
    })
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return
    setOrderItems(prev =>
      newQuantity === 0
        ? prev.filter(item => item.menuItem.id !== itemId)
        : prev.map(item =>
            item.menuItem.id === itemId
              ? { ...item, quantity: newQuantity }
              : item
          )
    )
  }

  const handlePrintOrder = async () => {
    try {
      if (!isPrinterConnected) {
        alert('프린터가 연결되지 않았습니다.')
        return
      }

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
        memo: memo || undefined
      }

      await printOrder(order)
      alert('주문서가 출력되었습니다.')
      
      // 주문 초기화
      setOrderItems([])
      setMemo('')
    } catch (error) {
      console.error('주문서 출력 실패:', error)
      alert('주문서 출력에 실패했습니다.')
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
                key={menu.id}
                className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                onClick={() => handleAddItem(menu)}
              >
                <div className="font-bold">{menu.displayName}</div>
                <div className="text-gray-600">{menu.price.toLocaleString()}원</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
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
                key={item.menuItem.id}
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
                      handleUpdateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                    onClick={() =>
                      handleUpdateQuantity(item.menuItem.id, item.quantity + 1)
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
              className={`w-full py-3 rounded-lg text-lg font-medium ${
                isPrinterConnected
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
              onClick={handlePrintOrder}
              disabled={!isPrinterConnected}
            >
              {isPrinterConnected ? '주문서 출력' : '프린터 연결 안됨'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { OrderManagement }