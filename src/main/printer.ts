import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { Order } from '../types/menu';

export async function printOrder(order: Order): Promise<boolean> {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'printer:POS-58', // 프린터 이름에 맞게 수정 필요
      options: {
        timeout: 5000
      }
    });

    await printer.isPrinterConnected();

    // 헤더
    printer.alignCenter();
    printer.println('로뎀 카페');
    printer.println('주문번호: ' + order.id.slice(0, 8));
    printer.println(new Date(order.orderTime).toLocaleString());
    printer.drawLine();

    // 주문 내역
    printer.alignLeft();
    printer.println('주문 내역:');
    printer.drawLine();

    order.items.forEach(item => {
      printer.tableCustom([
        { text: item.menuItem.name, align: 'LEFT', width: 0.4 },
        { text: `${item.quantity}개`, align: 'CENTER', width: 0.2 },
        { text: `${(item.menuItem.price * item.quantity).toLocaleString()}원`, align: 'RIGHT', width: 0.4 }
      ]);
    });

    printer.drawLine();

    // 합계
    printer.alignRight();
    printer.println(`합계: ${order.totalPrice.toLocaleString()}원`);
    
    // 푸터
    printer.alignCenter();
    printer.println('\n이용해 주셔서 감사합니다.');
    printer.cut();

    await printer.execute();
    return true;
  } catch (error) {
    console.error('프린터 오류:', error);
    return false;
  }
}