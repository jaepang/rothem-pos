import { useState, useEffect } from 'react';
import { OrderItem } from '@/shared/types/order';
import { printOrder, initializePrinter, getPrinterStatus } from '@/shared/utils/printer';

export function OrderManagement() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);

  useEffect(() => {
    const checkPrinter = async () => {
      try {
        await initializePrinter();
        const status = await getPrinterStatus();
        setIsPrinterConnected(status);
      } catch {
        setIsPrinterConnected(false);
      }
    };
    checkPrinter();
  }, []);

  const handlePrintOrder = async () => {
    if (!isPrinterConnected) {
      alert('프린터가 연결되지 않았습니다.');
      return;
    }

    if (orderItems.length === 0) {
      alert('주문 항목을 선택해주세요.');
      return;
    }

    const newOrder = {
      id: crypto.randomUUID(),
      items: orderItems,
      totalAmount: orderItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0),
      orderDate: new Date().toISOString(),
      tableNumber,
      memo: memo.trim() || undefined
    };

    try {
      await printOrder(newOrder);
      // 주문 성공 후 초기화
      setOrderItems([]);
      setTableNumber('');
      setMemo('');
    } catch {
      alert('주문서 출력에 실패했습니다.');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">주문</h2>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isPrinterConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-500">
            {isPrinterConnected ? '프린터 연결됨' : '프린터 연결 안됨'}
          </span>
        </div>
        <button
          onClick={handlePrintOrder}
          className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
          disabled={!isPrinterConnected}
        >
          주문하기
        </button>
      </div>
      {/* 주문 내용 UI는 추후 구현 */}
    </div>
  );
}