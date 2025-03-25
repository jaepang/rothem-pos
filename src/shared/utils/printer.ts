import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { Order } from '../types/order';

interface PrinterConfig {
  type: PrinterTypes;
  interface: string;
  width: number;
  characterSet: CharacterSet;
  removeSpecialCharacters: boolean;
  options?: {
    timeout?: number;
  };
}

let printerConfig: PrinterConfig | null = null;

export const initializePrinter = (config: PrinterConfig) => {
  printerConfig = config;
};

export const printOrder = async (order: Order): Promise<void> => {
  if (!printerConfig) {
    throw new Error('프린터가 초기화되지 않았습니다.');
  }

  try {
    const printer = new ThermalPrinter(printerConfig);
    await printer.init();

    // 주문서 헤더
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println('주문서');
    printer.bold(false);
    printer.newLine();

    // 주문 정보
    printer.alignLeft();
    printer.println(`주문번호: ${order.id}`);
    printer.println(`주문시간: ${new Date(order.orderDate).toLocaleString()}`);
    if (order.tableNumber) {
      printer.println(`테이블: ${order.tableNumber}`);
    }
    printer.drawLine();

    // 주문 항목
    printer.bold(true);
    printer.println('메뉴                수량      금액');
    printer.bold(false);
    printer.drawLine();

    order.items.forEach((item) => {
      const menuName = item.menuItem.name.padEnd(16, ' ');
      const quantity = item.quantity.toString().padStart(3, ' ');
      const amount = (item.menuItem.price * item.quantity).toLocaleString().padStart(8, ' ');
      printer.println(`${menuName} ${quantity}   ${amount}`);
    });

    printer.drawLine();

    // 합계
    printer.alignRight();
    printer.bold(true);
    printer.println(`합계: ${order.totalAmount.toLocaleString()}원`);
    printer.bold(false);

    // 메모
    if (order.memo) {
      printer.alignLeft();
      printer.newLine();
      printer.println('[메모]');
      printer.println(order.memo);
    }

    // 푸터
    printer.newLine();
    printer.alignCenter();
    printer.println('이용해 주셔서 감사합니다.');
    printer.cut();

    await printer.execute();
  } catch (error) {
    console.error('주문서 출력 실패:', error);
    throw error;
  }
};

export const getPrinterStatus = async (): Promise<boolean> => {
  if (!printerConfig) return false;

  try {
    const printer = new ThermalPrinter(printerConfig);
    await printer.init();
    const isConnected = printer.isPrinterConnected();
    return isConnected;
  } catch (error) {
    console.error('프린터 상태 확인 실패:', error);
    return false;
  }
}; 