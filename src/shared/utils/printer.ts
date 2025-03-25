import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { Order, OrderItem } from '@/shared/types/order';

const printerConfig = {
  type: PrinterTypes.EPSON,
  interface: 'printer:POS-58',
  options: {
    timeout: 3000
  }
};

let printer: ThermalPrinter | null = null;

export const initializePrinter = async (): Promise<void> => {
  try {
    printer = new ThermalPrinter(printerConfig);
    await printer.isPrinterConnected();
  } catch (error) {
    console.error('프린터 초기화 실패:', error);
    printer = null;
  }
};

export const getPrinterStatus = async (): Promise<boolean> => {
  if (!printer) {
    return false;
  }
  try {
    const p = printer;
    return await p.isPrinterConnected();
  } catch (error) {
    console.error('프린터 상태 확인 실패:', error);
    return false;
  }
};

export const printOrder = async (order: Order): Promise<void> => {
  if (!printer) {
    throw new Error('프린터가 연결되지 않았습니다.');
  }

  try {
    const p = printer;
    // 헤더 출력
    p.alignCenter();
    p.bold(true);
    p.setTextSize(1, 1);
    p.println('주문서');
    p.println('===================');
    p.bold(false);
    p.alignLeft();

    // 주문 정보 출력
    p.println(`주문번호: ${order.id}`);
    p.println(`주문시간: ${new Date(order.orderDate).toLocaleString()}`);
    p.println('-------------------');

    // 주문 항목 출력
    order.items.forEach((item: OrderItem) => {
      p.println(`${item.menuItem.name} x ${item.quantity}`);
      p.alignRight();
      p.println(`${(item.menuItem.price * item.quantity).toLocaleString()}원`);
      p.alignLeft();
    });

    // 합계 출력
    p.println('===================');
    p.bold(true);
    p.println('합계');
    p.alignRight();
    p.println(`${order.totalAmount.toLocaleString()}원`);
    p.alignLeft();
    p.bold(false);

    // 메모 출력
    if (order.memo) {
      p.println('-------------------');
      p.println('메모:');
      p.println(order.memo);
    }

    // 푸터 출력
    p.println('\n\n');
    p.cut();
    await p.execute();
  } catch (error) {
    console.error('주문서 출력 실패:', error);
    throw new Error('주문서 출력에 실패했습니다.');
  }
};