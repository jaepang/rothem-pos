import { useState, useEffect } from 'react';
import { MenuItem, MenuList } from '@/shared/types/menu';
import { Order, OrderItem } from '@/shared/types/order';
import { loadMenuFromJson } from '@/shared/utils/menu';
import { initializePrinter, printOrder, getPrinterStatus } from '@/shared/utils/printer';
import { PrinterTypes, CharacterSet } from 'node-thermal-printer';

export function OrderManagement() {
  const [menus, setMenus] = useState<MenuList>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);

  useEffect(() => {
    const loadedMenus = loadMenuFromJson();
    setMenus(loadedMenus);

    // 프린터 초기화
    initializePrinter({
      type: PrinterTypes.EPSON,
      interface: 'printer:auto',
      width: 48,
      characterSet: CharacterSet.PC437_USA,
      removeSpecialCharacters: false,
      options: {
        timeout: 5000
      }
    });

    // 프린터 상태 확인
    checkPrinterStatus();
  }, []);

  const checkPrinterStatus = async () => {
    const status = await getPrinterStatus();
    setIsPrinterConnected(status);
  };

  const handleAddToOrder = (menu: MenuItem) => {
    const existingItem = orderItems.find(item => item.menuItem.id === menu.id);
    
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.menuItem.id === menu.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, { menuItem: menu, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (menuId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(item => item.menuItem.id !== menuId));
    } else {
      setOrderItems(orderItems.map(item =>
        item.menuItem.id === menuId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const handlePrintOrder = async () => {
    if (!isPrinterConnected) {
      alert('프린터가 연결되지 않았습니다.');
      return;
    }

    if (orderItems.length === 0) {
      alert('주문 항목을 선택해주세요.');
      return;
    }

    const order: Order = {
      id: crypto.randomUUID(),
      items: orderItems,
      totalAmount: orderItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0),
      orderDate: new Date().toISOString(),
      tableNumber,
      memo: memo.trim() || undefined
    };

    try {
      await printOrder(order);
      // 주문 성공 후 초기화
      setOrderItems([]);
      setTableNumber('');
      setMemo('');
    } catch (error) {
      alert('주문서 출력에 실패했습니다.');
    }
  };

  const categories = ['all', ...new Set(menus.map(menu => menu.category))];
  const filteredMenus = selectedCategory === 'all'
    ? menus
    : menus.filter(menu => menu.category === selectedCategory);

  return (
    <div className="flex gap-4">
      {/* 메뉴 선택 영역 */}
      <div className="flex-1 space-y-4">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              }`}
            >
              {category === 'all' ? '전체' : category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenus.map(menu => (
            <button
              key={menu.id}
              onClick={() => !menu.isSoldOut && handleAddToOrder(menu)}
              disabled={menu.isSoldOut}
              className={`p-4 border rounded-lg text-left space-y-2 hover:shadow-md transition-shadow ${
                menu.isSoldOut ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/10'
              }`}
            >
              {menu.imageUrl && (
                <div className="aspect-square rounded-md overflow-hidden">
                  <img
                    src={menu.imageUrl}
                    alt={menu.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold">{menu.name}</h3>
              <p className="text-sm text-muted-foreground">{menu.category}</p>
              <p className="font-medium">{menu.price.toLocaleString()}원</p>
            </button>
          ))}
        </div>
      </div>

      {/* 주문 영역 */}
      <div className="w-96 border-l p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">주문 내역</h2>
          <div className={`w-3 h-3 rounded-full ${
            isPrinterConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>

        <input
          type="text"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="테이블 번호"
          className="w-full px-3 py-2 border rounded"
        />

        <div className="space-y-2">
          {orderItems.map(item => (
            <div key={item.menuItem.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.menuItem.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.menuItem.price.toLocaleString()}원
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleUpdateQuantity(item.menuItem.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center border rounded"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => handleUpdateQuantity(item.menuItem.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center border rounded"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="요청사항"
          className="w-full h-24 px-3 py-2 border rounded resize-none"
        />

        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>합계</span>
            <span>
              {orderItems
                .reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
                .toLocaleString()}원
            </span>
          </div>
        </div>

        <button
          onClick={handlePrintOrder}
          disabled={!isPrinterConnected || orderItems.length === 0}
          className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          주문서 출력
        </button>
      </div>
    </div>
  );
} 