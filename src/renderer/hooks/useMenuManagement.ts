import { useState, useEffect, useRef } from 'react'
import { MenuItem, MenuList, CategoryList } from '@/shared/types/menu'
import { InventoryList, InventoryItem } from '@/shared/types/inventory'
import { importMenuFromExcel, exportMenuToExcel, deleteMenuItem } from '@/shared/utils/menu'
import { loadCategories } from '@/shared/utils/category'
import { DataService } from '@/firebase/dataService'
import { useAuth } from '@/firebase/AuthContext'

export const useMenuManagement = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [categories, setCategories] = useState<CategoryList>([])
  const [inventory, setInventory] = useState<InventoryList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | undefined>(undefined)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const { token } = useAuth()

  useEffect(() => {
    loadData()
  }, [token])

  const loadData = async () => {
    try {
      // 메뉴, 재고 데이터 로드
      const [loadedMenus, loadedInventory] = await Promise.all([
        DataService.loadData('menu', token || undefined),
        DataService.loadData('inventory', token || undefined)
      ])
    
    // 메뉴 목록을 loadCategories에 전달하여 필요한 카테고리를 생성합니다
      const loadedCategories = await loadCategories(loadedMenus)
    
    setMenus(loadedMenus)
    setCategories(loadedCategories)
    setInventory(loadedInventory)
    } catch (error) {
      console.error('메뉴 데이터 로드 실패:', error)
      alert('메뉴 데이터를 불러오는데 실패했습니다.')
    }
  }

  const handleExportMenus = () => {
    if (menus.length === 0) {
      alert('내보낼 메뉴가 없습니다.')
      return
    }
    exportMenuToExcel(menus)
  }

  const handleImportMenus = async (file: File) => {
    try {
      const importedMenus = await importMenuFromExcel(file)
      setMenus(importedMenus)
      await DataService.saveData('menu', importedMenus, token || undefined)
      
      // 카테고리 업데이트
      const loadedCategories = await loadCategories(importedMenus)
      setCategories(loadedCategories)
      
      return true
    } catch (error) {
      console.error('메뉴 가져오기 실패:', error)
      return false
    }
  }

  const handleToggleSoldOut = async (menuId: string) => {
    try {
      const updatedMenus = menus.map(menu =>
        menu.id === menuId
          ? { ...menu, isSoldOut: !menu.isSoldOut }
          : menu
    )
    setMenus(updatedMenus)
      await DataService.saveData('menu', updatedMenus, token || undefined)
    } catch (error) {
      console.error('메뉴 품절 상태 변경 실패:', error)
      alert('메뉴 품절 상태를 변경하는데 실패했습니다.')
    }
  }

  const handleSubmitMenu = async (menuData: Omit<MenuItem, 'id'>) => {
    try {
    if (selectedMenu) {
      // 메뉴 수정
      const updatedMenus = menus.map(menu =>
        menu.id === selectedMenu.id
          ? { ...menuData, id: menu.id }
          : menu
      )
      setMenus(updatedMenus)
        await DataService.saveData('menu', updatedMenus, token || undefined)
    } else {
      // 새 메뉴 추가
      const newMenu = {
        ...menuData,
        id: Date.now().toString()
      }
      const updatedMenus = [...menus, newMenu]
      setMenus(updatedMenus)
        await DataService.saveData('menu', updatedMenus, token || undefined)
    }
    setIsAddModalOpen(false)
    setSelectedMenu(undefined)
    } catch (error) {
      console.error('메뉴 저장 실패:', error)
      alert('메뉴를 저장하는데 실패했습니다.')
    }
  }

  const handleEditMenu = (menu: MenuItem) => {
    // displayMenus에서 변형된 메뉴가 아닌 원본 메뉴를 찾아서 사용
    const originalMenu = menus.find(m => m.id === menu.id)
    if (originalMenu) {
      setSelectedMenu(originalMenu)
      setIsAddModalOpen(true)
    }
  }

  const handleDeleteMenu = async (menu: MenuItem) => {
    if (confirm('이 메뉴를 삭제하시겠습니까?')) {
      try {
      const updatedMenus = deleteMenuItem(menu, menus)
      setMenus(updatedMenus)
        await DataService.saveData('menu', updatedMenus, token || undefined)
      } catch (error) {
        console.error('메뉴 삭제 실패:', error)
        alert('메뉴를 삭제하는데 실패했습니다.')
      }
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