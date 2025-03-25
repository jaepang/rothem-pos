import { Order } from '@/shared/types/order'

export const initializePrinter = async (): Promise<void> => {
  try {
    await window.electronAPI.printer.initialize()
  } catch (error) {
    console.error('프린터 초기화 실패:', error)
  }
}

export const getPrinterStatus = async (): Promise<boolean> => {
  try {
    return await window.electronAPI.printer.getStatus()
  } catch (error) {
    console.error('프린터 상태 확인 실패:', error)
    return false
  }
}

export const printOrder = async (order: Order): Promise<void> => {
  try {
    await window.electronAPI.printer.printOrder(order)
  } catch (error) {
    console.error('주문서 출력 실패:', error)
    throw error
  }
}