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

// 상수
export const ORDERS_STORAGE_KEY = 'pos_orders' // 하위 호환성을 위해 유지

// 파일에서 주문 목록 불러오기
export const loadOrdersFromFile = async (): Promise<OrderList> => {
  try {
    return await window.electronAPI.orders.loadOrdersFromJson()
  } catch (error) {
    console.error('주문 데이터 불러오기 실패:', error)
    
    // 폴백: localStorage에서 시도
    try {
      const ordersJson = localStorage.getItem(ORDERS_STORAGE_KEY)
      return ordersJson ? JSON.parse(ordersJson) : []
    } catch (localError) {
      console.error('localStorage 주문 데이터 불러오기 실패:', localError)
      return []
    }
  }
}

// 파일에 주문 목록 저장하기
export const saveOrdersToFile = async (orders: OrderList): Promise<void> => {
  try {
    await window.electronAPI.orders.saveOrdersToJson(orders)
  } catch (error) {
    console.error('주문 데이터 저장 실패:', error)
  }
}

// 단일 주문 저장 (이전 주문과 병합)
export const saveOrder = async (order: Order): Promise<void> => {
  try {
    // 파일에서 주문 목록 불러오기
    const allOrders = await loadOrdersFromFile()
    
    const existingOrderIndex = allOrders.findIndex((o: Order) => o.id === order.id)
    if (existingOrderIndex >= 0) {
      // 기존 주문 업데이트
      allOrders[existingOrderIndex] = order
    } else {
      // 새 주문 추가
      allOrders.push(order)
    }
    
    // 파일에 저장
    await saveOrdersToFile(allOrders)
    
    // localStorage 하위 호환성 유지
    try {
      const localStorageOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
      const parsedOrders = localStorageOrders ? JSON.parse(localStorageOrders) : []
      
      const localExistingOrderIndex = parsedOrders.findIndex((o: Order) => o.id === order.id)
      if (localExistingOrderIndex >= 0) {
        parsedOrders[localExistingOrderIndex] = order
      } else {
        parsedOrders.push(order)
      }
      
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(parsedOrders))
    } catch (error) {
      console.error('localStorage 주문 저장 실패:', error)
    }
  } catch (error) {
    console.error('주문 저장 실패:', error)
    
    // 폴백: localStorage에만 저장
    try {
      const ordersJson = localStorage.getItem(ORDERS_STORAGE_KEY)
      const localOrders = ordersJson ? JSON.parse(ordersJson) : []
      
      const existingOrderIndex = localOrders.findIndex((o: Order) => o.id === order.id)
      if (existingOrderIndex >= 0) {
        localOrders[existingOrderIndex] = order
      } else {
        localOrders.push(order)
      }
      
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(localOrders))
    } catch (localError) {
      console.error('localStorage 폴백 저장 실패:', localError)
    }
  }
}

// 주문 목록 가져오기 (상태별 필터링 지원)
export const getOrders = async (status?: 'pending' | 'completed' | 'cancelled'): Promise<OrderList> => {
  try {
    const allOrders = await loadOrdersFromFile()
    
    if (!status) return allOrders
    
    return allOrders.filter((order: Order) => order.status === status)
  } catch (error) {
    console.error('주문 목록 불러오기 실패:', error)
    return []
  }
}

// 주문 상태 업데이트
export const updateOrderStatus = async (orderId: string, status: 'pending' | 'completed' | 'cancelled'): Promise<void> => {
  try {
    const orders = await loadOrdersFromFile()
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status } : order
    )
    await saveOrdersToFile(updatedOrders)
    
    // localStorage 하위 호환성 유지
    try {
      const localStorageOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
      if (localStorageOrders) {
        const parsedOrders = JSON.parse(localStorageOrders)
        const updatedLocalOrders = parsedOrders.map((order: Order) => 
          order.id === orderId ? { ...order, status } : order
        )
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedLocalOrders))
      }
    } catch (error) {
      console.error('localStorage 주문 상태 업데이트 실패:', error)
    }
  } catch (error) {
    console.error('주문 상태 업데이트 실패:', error)
  }
}

// 주문 출력 상태 업데이트
export const updateOrderPrintStatus = async (orderId: string, printed: boolean): Promise<void> => {
  try {
    const orders = await loadOrdersFromFile()
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, printed } : order
    )
    await saveOrdersToFile(updatedOrders)
    
    // localStorage 하위 호환성 유지
    try {
      const localStorageOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
      if (localStorageOrders) {
        const parsedOrders = JSON.parse(localStorageOrders)
        const updatedLocalOrders = parsedOrders.map((order: Order) => 
          order.id === orderId ? { ...order, printed } : order
        )
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedLocalOrders))
      }
    } catch (error) {
      console.error('localStorage 주문 출력 상태 업데이트 실패:', error)
    }
  } catch (error) {
    console.error('주문 출력 상태 업데이트 실패:', error)
  }
}

// 날짜별 주문 가져오기
export const getOrdersByDate = async (date: Date): Promise<OrderList> => {
  try {
    const orders = await loadOrdersFromFile()
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate)
      orderDate.setHours(0, 0, 0, 0)
      return orderDate.getTime() === targetDate.getTime()
    })
  } catch (error) {
    console.error('날짜별 주문 목록 불러오기 실패:', error)
    return []
  }
}

// 주간 주문 가져오기
export const getOrdersByWeek = async (date: Date): Promise<OrderList> => {
  try {
    const orders = await loadOrdersFromFile()
    const targetDate = new Date(date)
    
    // 주의 시작일(일요일) 구하기
    const startOfWeek = new Date(targetDate)
    startOfWeek.setDate(targetDate.getDate() - targetDate.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    // 주의 종료일(토요일) 구하기
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate)
      return orderDate >= startOfWeek && orderDate <= endOfWeek
    })
  } catch (error) {
    console.error('주간 주문 목록 불러오기 실패:', error)
    return []
  }
}

// 월간 주문 가져오기
export const getOrdersByMonth = async (date: Date): Promise<OrderList> => {
  try {
    const orders = await loadOrdersFromFile()
    const targetYear = date.getFullYear()
    const targetMonth = date.getMonth()
    
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate)
      return orderDate.getFullYear() === targetYear && orderDate.getMonth() === targetMonth
    })
  } catch (error) {
    console.error('월간 주문 목록 불러오기 실패:', error)
    return []
  }
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
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelOrder[]

        const orderMap = new Map<string, Order>()
        const menus = await loadMenuFromJson()

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
              memo: row.메모 || undefined,
              status: 'completed',
              printed: true
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