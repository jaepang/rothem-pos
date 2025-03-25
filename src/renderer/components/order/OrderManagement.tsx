import { useState } from 'react';
import { OrderItem } from '@/shared/types/order';
import { printOrder } from '@/shared/utils/printer';

export function OrderManagement() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(false);

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
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          isPrinterConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className="text-sm text-gray-500">
          {isPrinterConnected ? '프린터 연결됨' : '프린터 연결 안됨'}
        </span>
      </div>
      {/* 주문 내용 UI는 추후 구현 */}
    </div>
  );
}