import { useState, useEffect, useRef } from 'react';
import { MenuItem, MenuList } from '@/shared/types/menu';
import { Order, OrderItem, OrderList } from '@/shared/types/order';
import { loadMenuFromJson } from '@/shared/utils/menu';
import { initializePrinter, printOrder, getPrinterStatus } from '@/shared/utils/printer';
import { exportOrdersToExcel, importOrdersFromExcel } from '@/shared/utils/order';
import { PrinterTypes, CharacterSet } from 'node-thermal-printer';

export function OrderManagement() {
  const [menus, setMenus] = useState<MenuList>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);
  const [orders, setOrders] = useState<OrderList>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... existing code ...

  const handlePrintOrder = async () => {
    if (!isPrinterConnected) {
      alert('프린터가 연결되지 않았습니다.');
      return;
    }

    if (orderItems.length === 0) {
      alert('주문 항목을 선택해주세요.');
      return;
    }

    const newOrder: Order = {
      id: crypto.randomUUID(),
      items: orderItems,
      totalAmount: orderItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0),
      orderDate: new Date().toISOString(),
      tableNumber,
      memo: memo.trim() || undefined
    };

    try {
      await printOrder(newOrder);
      // 주문 내역에 추가
      setOrders([...orders, newOrder]);
      // 주문 성공 후 초기화
      setOrderItems([]);
      setTableNumber('');
      setMemo('');
    } catch {
      alert('주문서 출력에 실패했습니다.');
    }
  };

  const handleExportOrders = () => {
    if (orders.length === 0) {
      alert('내보낼 주문 내역이 없습니다.');
      return;
    }
    exportOrdersToExcel(orders);
  };

  const handleImportOrders = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedOrders = await importOrdersFromExcel(file);
      setOrders([...orders, ...importedOrders]);
      alert(`${importedOrders.length}개의 주문을 가져왔습니다.`);
    } catch (error) {
      alert('주문 내역을 가져오는데 실패했습니다.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex gap-4">
      {/* ... existing menu selection area ... */}

      {/* 주문 영역 */}
      <div className="w-96 border-l p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">주문 내역</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isPrinterConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <button
              onClick={handleExportOrders}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              엑셀 내보내기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleImportOrders}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              엑셀 가져오기
            </button>
          </div>
        </div>

        {/* ... rest of the existing order area ... */}
      </div>
    </div>
  );
}