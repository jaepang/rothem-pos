import { useState, useEffect, useRef } from 'react'
import { MenuItem, MenuList, CategoryList } from '@/shared/types/menu'
import { InventoryList, InventoryItem } from '@/shared/types/inventory'
import { loadMenuFromJson, saveMenuToJson, importMenuFromExcel, exportMenuToExcel, deleteMenuItem } from '@/shared/utils/menu'
import { loadCategories } from '@/shared/utils/category'
import { loadInventoryFromJson } from '@/shared/utils/inventory'
import { MenuFormModal } from './MenuFormModal'
import { MenuCard } from './MenuCard'

export function MenuManagement() {
  const [menus, setMenus] = useState<MenuList>([])
  const [categories, setCategories] = useState<CategoryList>([])
  const [inventory, setInventory] = useState<InventoryList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | undefined>(undefined)
  const excelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const [loadedMenus, loadedCategories, loadedInventory] = await Promise.all([
        loadMenuFromJson(),
        loadCategories(),
        loadInventoryFromJson()
      ])
      setMenus(loadedMenus)
      setCategories(loadedCategories)
      setInventory(loadedInventory)
    }
    loadData()
  }, [])

  const handleExportMenus = () => {
    if (menus.length === 0) {
      alert('내보낼 메뉴가 없습니다.')
      return
    }
    exportMenuToExcel(menus)
  }

  const handleImportMenus = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
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

  // 특정 메뉴와 연관된 재고 항목 찾기
  const getRelatedInventory = (menuId: string) => {
    return inventory.filter(item => item.relatedMenuIds.includes(menuId))
  }

  // 재고 이름 목록 가져오기
  const getInventoryNames = (inventoryItems: InventoryItem[]) => {
    return inventoryItems.map(item => item.name).join(', ')
  }

  // 특정 메뉴에 필요한 모든 재고가 충분한지 확인
  const hasAllRequiredInventory = (menuId: string) => {
    const relatedInventory = inventory.filter(item => 
      item.relatedMenuIds.includes(menuId)
    )
    
    // 연관된 재고가 없거나 모든 재고가 0보다 크면 true
    return relatedInventory.length === 0 || 
      relatedInventory.every(item => item.quantity > 0)
  }

  // 특정 메뉴에 부족한 재고 목록 가져오기
  const getMissingInventory = (menuId: string) => {
    return inventory
      .filter(item => item.relatedMenuIds.includes(menuId) && item.quantity <= 0)
      .map(item => item.name)
      .join(', ')
  }

  const handleDeleteMenu = (menu: MenuItem) => {
    if (confirm('이 메뉴를 삭제하시겠습니까?')) {
      const updatedMenus = deleteMenuItem(menu, menus)
      setMenus(updatedMenus)
      saveMenuToJson(updatedMenus)
    }
  }

  const categoryNames = ['all', ...categories.map(category => category.name)]
  const filteredMenus = selectedCategory === 'all'
    ? menus
    : menus.filter((menu) => menu.category === selectedCategory)

  const displayMenus = filteredMenus.map(menu => {
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

  return (
    <div className="space-y-6 pt-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold">메뉴 관리</h2>
          <div className="flex space-x-2 overflow-x-auto">
            {categoryNames.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                }`}
              >
                {category === 'all' ? '전체' : category}
              </button>
            ))}
          </div>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => {
              setSelectedMenu(undefined)
              setIsAddModalOpen(true)
            }}
            className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-primary/90"
          >
            메뉴 추가
          </button>
          <button
            onClick={handleExportMenus}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            엑셀 내보내기
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportMenus}
            className="hidden"
          />
          <button
            onClick={() => excelInputRef.current?.click()}
            className="px-4 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
          >
            엑셀 가져오기
          </button>
        </div>
      </div>

      <div className="h-[calc(100vh-12rem)] overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayMenus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onEdit={handleEditMenu}
              onToggleSoldOut={handleToggleSoldOut}
              onDelete={handleDeleteMenu}
              getRelatedInventory={getRelatedInventory}
              getInventoryNames={getInventoryNames}
              hasAllRequiredInventory={hasAllRequiredInventory}
              getMissingInventory={getMissingInventory}
            />
          ))}
        </div>
      </div>

      <MenuFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setSelectedMenu(undefined)
        }}
        onSubmit={handleSubmitMenu}
        categories={categories.map(category => category.name)}
        initialData={selectedMenu}
        inventory={inventory}
      />
    </div>
  )
}