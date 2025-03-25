import React, { useEffect, useState } from 'react';
import { MenuItem, MenuList } from '@/shared/types/menu';
import { Order, OrderItem } from '@/shared/types/order';
import { loadMenuFromJson } from '@/shared/utils/menu';
import { initializePrinter, getPrinterStatus, printOrder } from '@/shared/utils/printer';

const OrderManagement: React.FC = () => {
  const [menus, setMenus] = useState<MenuList>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [memo, setMemo] = useState<string>('');
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);

  useEffect(() => {
    const loadMenus = async () => {
      const loadedMenus = await loadMenuFromJson();
      setMenus(loadedMenus);
    };

    const initPrinter = async () => {
      await initializePrinter();
      const status = await getPrinterStatus();
      setIsPrinterConnected(status);
    };

    loadMenus();
    initPrinter();
  }, []);

  const categories = ['전체', ...new Set(menus.map(menu => menu.category))];
  const filteredMenus = selectedCategory === '전체'
    ? menus
    : menus.filter(menu => menu.category === selectedCategory);

  const handleAddItem = (menu: MenuItem) => {
    setOrderItems(prev => {
      const existingItem = prev.find(item => item.menuItem.id === menu.id);
      if (existingItem) {
        return prev.map(item =>
          item.menuItem.id === menu.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem: menu, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setOrderItems(prev =>
      newQuantity === 0
        ? prev.filter(item => item.menuItem.id !== itemId)
        : prev.map(item =>
            item.menuItem.id === itemId
              ? { ...item, quantity: newQuantity }
              : item
          )
    );
  };

  const handlePrintOrder = async () => {
    try {
      if (!isPrinterConnected) {
        alert('프린터가 연결되지 않았습니다.');
        return;
      }

      if (orderItems.length === 0) {
        alert('주문 항목을 선택해주세요.');
        return;
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
      };

      await printOrder(order);
      alert('주문서가 출력되었습니다.');
      
      // 주문 초기화
      setOrderItems([]);
      setMemo('');
    } catch (error) {
      console.error('주문서 출력 실패:', error);
      alert('주문서 출력에 실패했습니다.');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">주문 관리</h2>
        <div className="flex items-center space-x-2 mb-4">
          {categories.map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xl font-bold mb-2">메뉴</h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredMenus.map(menu => (
              <button
                key={menu.id}
                className="p-2 bg-white border rounded shadow"
                onClick={() => handleAddItem(menu)}
              >
                <div className="font-bold">{menu.name}</div>
                <div className="text-gray-600">{menu.price.toLocaleString()}원</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-2">주문 내역</h3>
          <div className="mb-4">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">
                메모
              </label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={memo}
                onChange={e => setMemo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            {orderItems.map(item => (
              <div
                key={item.menuItem.id}
                className="flex items-center justify-between p-2 bg-white border rounded"
              >
                <div>
                  <div className="font-bold">{item.menuItem.name}</div>
                  <div className="text-gray-600">
                    {(item.menuItem.price * item.quantity).toLocaleString()}원
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="px-2 py-1 bg-gray-200 rounded"
                    onClick={() =>
                      handleUpdateQuantity(item.menuItem.id, item.quantity - 1)
                    }
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="px-2 py-1 bg-gray-200 rounded"
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

          <div className="mt-4">
            <div className="text-xl font-bold mb-2">
              합계: {orderItems
                .reduce(
                  (sum, item) => sum + item.menuItem.price * item.quantity,
                  0
                )
                .toLocaleString()}원
            </div>
            <button
              className={`w-full py-2 rounded ${
                isPrinterConnected
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-400 cursor-not-allowed'
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
  );
};

export { OrderManagement };