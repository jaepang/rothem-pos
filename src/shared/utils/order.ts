import * as XLSX from 'xlsx'
import { Order, OrderList } from '../types/order'
import { loadMenuFromJson } from './menu'

interface ExcelOrder {
  주문번호: string;
  테이블번호: string;
  메뉴: string;
  수량: number;
  단가: number;
  금액: number;
  주문시간: string;
  메모: string;
}

export const exportOrdersToExcel = (orders: OrderList): void => {
  const excelData: ExcelOrder[] = []

  orders.forEach(order => {
    order.items.forEach(item => {
      excelData.push({
        주문번호: order.id,
        테이블번호: order.tableNumber || '',
        메뉴: item.menuItem.name,
        수량: item.quantity,
        단가: item.menuItem.price,
        금액: item.menuItem.price * item.quantity,
        주문시간: new Date(order.orderDate).toLocaleString(),
        메모: order.memo || ''
      })
    })
  })

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '주문내역')

  // 열 너비 설정
  const columnWidths = [
    { wch: 15 }, // 주문번호
    { wch: 10 }, // 테이블번호
    { wch: 20 }, // 메뉴
    { wch: 8 },  // 수량
    { wch: 10 }, // 단가
    { wch: 10 }, // 금액
    { wch: 20 }, // 주문시간
    { wch: 30 }, // 메모
  ]
  worksheet['!cols'] = columnWidths

  XLSX.writeFile(workbook, `주문내역_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const importOrdersFromExcel = (file: File): Promise<OrderList> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const menus = loadMenuFromJson()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelOrder[]

        const orderMap = new Map<string, Order>()

        jsonData.forEach((row) => {
          const menuItem = menus.find(m => m.name === row.메뉴)
          if (!menuItem) {
            throw new Error(`메뉴를 찾을 수 없습니다: ${row.메뉴}`)
          }

          if (!orderMap.has(row.주문번호)) {
            orderMap.set(row.주문번호, {
              id: row.주문번호,
              items: [],
              totalAmount: 0,
              orderDate: new Date(row.주문시간).toISOString(),
              tableNumber: row.테이블번호 || undefined,
              memo: row.메모 || undefined
            })
          }

          const order = orderMap.get(row.주문번호)!
          order.items.push({
            menuItem,
            quantity: row.수량
          })
          order.totalAmount += row.금액
        })

        resolve(Array.from(orderMap.values()))
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'))
    reader.readAsArrayBuffer(file)
  })
}