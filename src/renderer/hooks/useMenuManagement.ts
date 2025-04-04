import { useState, useEffect, useRef } from 'react'
import { MenuItem, MenuList, CategoryList } from '@/shared/types/menu'
import { InventoryList, InventoryItem } from '@/shared/types/inventory'
import { loadMenuFromJson, saveMenuToJson, importMenuFromExcel, exportMenuToExcel, deleteMenuItem } from '@/shared/utils/menu'
import { loadCategories } from '@/shared/utils/category'
import { loadInventoryFromJson } from '@/shared/utils/inventory'

export const useMenuManagement = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [categories, setCategories] = useState<CategoryList>([])
  const [inventory, setInventory] = useState<InventoryList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | undefined>(undefined)
  const excelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // 먼저 메뉴를 불러옵니다
    const loadedMenus = await loadMenuFromJson()
    
    // 메뉴 목록을 loadCategories에 전달하여 필요한 카테고리를 생성합니다
    const [loadedCategories, loadedInventory] = await Promise.all([
      loadCategories(loadedMenus),
      loadInventoryFromJson()
    ])
    
    setMenus(loadedMenus)
    setCategories(loadedCategories)
    setInventory(loadedInventory)
  }

  const handleExportMenus = () => {
    if (menus.length === 0) {
      alert('내보낼 메뉴가 없습니다.')
      return
    }
    exportMenuToExcel(menus)
  }

  const handleImportMenus = async (file: File) => {
    if (!file) return

    try {
      const importedMenus = await importMenuFromExcel(file)
      setMenus(importedMenus)
      saveMenuToJson(importedMenus)
      alert(`${importedMenus.length}개의 메뉴를 가져왔습니다.`)
    } catch {
      alert('메뉴를 가져오는데 실패했습니다.')
    } finally {
      if (excelInputRef.current) {
        excelInputRef.current.value = ''
      }
    }
  }

  const handleToggleSoldOut = (menuId: string) => {
    // 메뉴 찾기
    const menu = menus.find(m => m.id === menuId)
    if (!menu) return
    
    // 관련 재고 확인
    const relatedInventory = inventory.filter(item => 
      item.relatedMenuIds.includes(menuId)
    )
    
    // 재고가 모두 충분한지 확인
    const allInventorySufficient = relatedInventory.length === 0 || 
      relatedInventory.every(item => item.quantity > 0)
    
    // 현재 품절 상태
    const isSoldOut = menu.isSoldOut
    
    const newSoldOut = !isSoldOut
    
    // 재고가 부족한 상태에서 판매중으로 변경하려는 경우
    if (isSoldOut && !allInventorySufficient) {
      const confirmToggle = confirm(
        '이 메뉴는 필요한 재고가 부족한 상태입니다.\n그래도 판매 상태로 변경하시겠습니까?'
      )
      if (!confirmToggle) {
        return
      }
    }
    
    const updatedMenus = menus.map((menu) =>
      menu.id === menuId ? { ...menu, isSoldOut: newSoldOut } : menu
    )
    setMenus(updatedMenus)
    saveMenuToJson(updatedMenus)
  }

  const handleSubmitMenu = (menuData: Omit<MenuItem, 'id'>) => {
    if (selectedMenu) {
      // 메뉴 수정
      const updatedMenus = menus.map(menu =>
        menu.id === selectedMenu.id
          ? { ...menuData, id: menu.id }
          : menu
      )
      setMenus(updatedMenus)
      saveMenuToJson(updatedMenus)
    } else {
      // 새 메뉴 추가
      const newMenu = {
        ...menuData,
        id: Date.now().toString()
      }
      const updatedMenus = [...menus, newMenu]
      setMenus(updatedMenus)
      saveMenuToJson(updatedMenus)
    }
    setIsAddModalOpen(false)
    setSelectedMenu(undefined)
  }

  const handleEditMenu = (menu: MenuItem) => {
    // displayMenus에서 변형된 메뉴가 아닌 원본 메뉴를 찾아서 사용
    const originalMenu = menus.find(m => m.id === menu.id)
    if (originalMenu) {
      setSelectedMenu(originalMenu)
      setIsAddModalOpen(true)
    }
  }

  const handleDeleteMenu = (menu: MenuItem) => {
    if (confirm('이 메뉴를 삭제하시겠습니까?')) {
      const updatedMenus = deleteMenuItem(menu, menus)
      setMenus(updatedMenus)
      saveMenuToJson(updatedMenus)
    }
  }

  // 재고 관련 함수들
  const getRelatedInventory = (menuId: string) => {
    return inventory.filter(item => item.relatedMenuIds.includes(menuId))
  }

  const getInventoryNames = (inventoryItems: InventoryItem[]) => {
    return inventoryItems.map(item => item.name).join(', ')
  }

  const hasAllRequiredInventory = (menuId: string) => {
    const relatedInventory = inventory.filter(item => 
      item.relatedMenuIds.includes(menuId)
    )
    
    // 연관된 재고가 없거나 모든 재고가 0보다 크면 true
    return relatedInventory.length === 0 || 
      relatedInventory.every(item => item.quantity > 0)
  }

  const getMissingInventory = (menuId: string) => {
    return inventory
      .filter(item => item.relatedMenuIds.includes(menuId) && item.quantity <= 0)
      .map(item => item.name)
      .join(', ')
  }

  // 메뉴 표시를 위한 가공
  const getDisplayMenus = () => {
    const filteredMenus = selectedCategory === 'all'
      ? menus
      : menus.filter((menu) => menu.category === selectedCategory)

    return filteredMenus.map(menu => {
      if (menu.category === '음료') {
        return [{
          ...menu,
          displayName: menu.name,
          price: Number(menu.icePrice || menu.price),
          priceInfo: `${menu.isIce ? `ICE ${menu.icePrice?.toLocaleString()}원` : ''}${menu.isIce && menu.isHot ? ' / ' : ''}${menu.isHot ? `HOT ${menu.hotPrice?.toLocaleString()}원` : ''}`
        }]
      }
      return [{
        ...menu,
        displayName: menu.name,
        priceInfo: `${menu.price.toLocaleString()}원`
      }]
    }).flat()
  }

  // 카테고리 목록 가져오기
  const getCategoryNames = () => {
    return ['all', ...categories.map(category => category.name)]
  }

  return {
    menus,
    categories,
    inventory,
    selectedCategory,
    setSelectedCategory,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedMenu,
    setSelectedMenu,
    excelInputRef,
    handleExportMenus,
    handleImportMenus,
    handleToggleSoldOut,
    handleSubmitMenu,
    handleEditMenu,
    handleDeleteMenu,
    getRelatedInventory,
    getInventoryNames,
    hasAllRequiredInventory,
    getMissingInventory,
    getDisplayMenus,
    getCategoryNames
  }
} 