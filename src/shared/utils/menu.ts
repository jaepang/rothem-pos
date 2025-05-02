import { MenuItem, MenuList } from '../types/menu'
import * as XLSX from 'xlsx'
import { deleteImage } from './image'

export const loadMenuFromJson = async (): Promise<MenuList> => {
  return await window.electronAPI.menu.loadMenuFromJson()
}

export const saveMenuToJson = async (menuList: MenuList): Promise<void> => {
  await window.electronAPI.menu.saveMenuToJson(menuList)
}

interface ExcelMenuItem {
  카테고리: string;
  메뉴명: string;
  가격: number;
}

export const exportMenuToExcel = (menuList: MenuList): void => {
  const excelData: ExcelMenuItem[] = menuList.map(menu => ({
    카테고리: menu.category,
    메뉴명: menu.name,
    가격: menu.price
  }))

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '메뉴목록')

  // 열 너비 설정
  const columnWidths = [
    { wch: 15 }, // 카테고리
    { wch: 30 }, // 메뉴명
    { wch: 10 }, // 가격
  ]
  worksheet['!cols'] = columnWidths

  XLSX.writeFile(workbook, `메뉴목록_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const importMenuFromExcel = (file: File): Promise<MenuList> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelMenuItem[]

        const menuList: MenuList = jsonData.map(row => ({
          id: crypto.randomUUID(),
          category: row.카테고리,
          name: row.메뉴명,
          price: row.가격,
          imageUrl: null,
          isAvailable: true,
          isSoldOut: false,
          isFavorite: false
        }))

        resolve(menuList)
      } catch {
        reject(new Error('엑셀 파일 형식이 올바르지 않습니다.'))
      }
    }

    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'))
    reader.readAsArrayBuffer(file)
  })
}

export const deleteMenuItem = (menu: MenuItem, menus: MenuList): MenuList => {
  // 메뉴 목록에서 제거
  return menus.filter((m) => m.id !== menu.id)
} 