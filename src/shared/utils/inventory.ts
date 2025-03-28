import * as XLSX from 'xlsx'
import { InventoryItem, InventoryList } from '../types/inventory'
import { MenuList } from '../types/menu'

// 재고 데이터 로드
export const loadInventoryFromJson = (): Promise<InventoryList> => {
  return new Promise((resolve) => {
    try {
      window.electronAPI.inventory.loadInventoryFromJson()
        .then(data => resolve(data))
        .catch(error => {
          console.error('재고 데이터 로드 실패:', error)
          resolve([])
        })
    } catch (error) {
      console.error('재고 데이터 로드 실패:', error)
      resolve([])
    }
  })
}

// 재고 데이터 저장
export const saveInventoryToJson = (inventory: InventoryList): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      window.electronAPI.inventory.saveInventoryToJson(inventory)
        .then(() => resolve())
        .catch(error => {
          console.error('재고 데이터 저장 실패:', error)
          reject(error)
        })
    } catch (error) {
      console.error('재고 데이터 저장 실패:', error)
      reject(error)
    }
  })
}

// 재고 수량 업데이트
export const updateInventoryQuantity = (
  inventory: InventoryList,
  itemId: string,
  newQuantity: number
): InventoryList => {
  return inventory.map((item) =>
    item.id === itemId ? { ...item, quantity: newQuantity } : item
  )
}

// 재고 아이템 추가
export const addInventoryItem = (
  inventory: InventoryList,
  item: Omit<InventoryItem, 'id'>
): InventoryList => {
  const newItem: InventoryItem = {
    ...item,
    id: Date.now().toString(),
  }
  return [...inventory, newItem]
}

// 재고 아이템 삭제
export const deleteInventoryItem = (
  inventory: InventoryList,
  itemId: string
): InventoryList => {
  return inventory.filter((item) => item.id !== itemId)
}

// 재고 아이템 수정
export const updateInventoryItem = (
  inventory: InventoryList,
  updatedItem: InventoryItem
): InventoryList => {
  return inventory.map((item) =>
    item.id === updatedItem.id ? updatedItem : item
  )
}

// 엑셀에서 재고 데이터 가져오기
export const importInventoryFromExcel = async (file: File): Promise<InventoryList> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)

        const inventory: InventoryList = json.map((row: any) => ({
          id: row.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: row.name || '',
          unit: row.unit || '',
          quantity: Number(row.quantity) || 0,
          relatedMenuIds: row.relatedMenuIds ? row.relatedMenuIds.split(',') : []
        }))

        resolve(inventory)
      } catch (error) {
        console.error('엑셀 파일 처리 실패:', error)
        reject(error)
      }
    }

    reader.onerror = (error) => {
      console.error('파일 읽기 실패:', error)
      reject(error)
    }

    reader.readAsArrayBuffer(file)
  })
}

// 엑셀로 재고 데이터 내보내기
export const exportInventoryToExcel = (inventory: InventoryList) => {
  try {
    // 내보낼 데이터 형식 변환
    const exportData = inventory.map(item => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      relatedMenuIds: item.relatedMenuIds.join(',')
    }))

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '재고 목록')

    // 파일 저장
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `재고목록_${new Date().toISOString().split('T')[0]}.xlsx`
    link.click()
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('엑셀 내보내기 실패:', error)
    throw error
  }
}

// 메뉴 품절 상태 업데이트
export const updateMenuSoldOutStatus = (
  inventory: InventoryList,
  menus: MenuList
): MenuList => {
  return menus.map(menu => {
    // 메뉴와 관련된 모든 재고 항목 찾기
    const relatedInventory = inventory.filter(item => 
      item.relatedMenuIds.includes(menu.id)
    )
    
    // 관련 재고가 없거나, 모든 관련 재고 중 하나라도 0이면 품절 처리
    const shouldBeSoldOut = relatedInventory.length > 0 && 
      relatedInventory.some(item => item.quantity <= 0)
    
    // 현재 메뉴가 이미 수동으로 품절 처리됐으면 건드리지 않고,
    // 그렇지 않으면 재고에 따라 품절 상태 업데이트
    return {
      ...menu,
      isSoldOut: menu.isSoldOut || shouldBeSoldOut
    }
  })
} 