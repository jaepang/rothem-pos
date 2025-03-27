import { useState, useEffect, useRef } from 'react'
import { MenuItem, MenuList, CategoryList } from '@/shared/types/menu'
import { loadMenuFromJson, saveMenuToJson, importMenuFromExcel, exportMenuToExcel, deleteMenuItem } from '@/shared/utils/menu'
import { loadCategories } from '@/shared/utils/category'
import { MenuFormModal } from './MenuFormModal'

export function MenuManagement() {
  const [menus, setMenus] = useState<MenuList>([])
  const [categories, setCategories] = useState<CategoryList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | undefined>(undefined)
  const excelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const [loadedMenus, loadedCategories] = await Promise.all([
        loadMenuFromJson(),
        loadCategories()
      ])
      setMenus(loadedMenus)
      setCategories(loadedCategories)
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
    const updatedMenus = menus.map((menu) =>
      menu.id === menuId ? { ...menu, isSoldOut: !menu.isSoldOut } : menu
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
        <h2 className="text-3xl font-bold">메뉴 관리</h2>
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

      <div className="flex space-x-2 overflow-x-auto pb-2">
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayMenus.map((menu) => (
          <div
            key={menu.id}
            className="p-4 border rounded-lg space-y-2 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleEditMenu(menu)}
          >
            <div>
              <h3 className="font-semibold">{menu.displayName}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {menu.category}
            </p>
            <p className="font-medium">{menu.priceInfo}</p>
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleSoldOut(menu.id)
                }}
                className={`flex-1 px-3 py-1 rounded transition-colors hover:opacity-90 ${
                  menu.isSoldOut
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {menu.isSoldOut ? '품절' : '판매중'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('이 메뉴를 삭제하시겠습니까?')) {
                    const updatedMenus = deleteMenuItem(menu, menus)
                    setMenus(updatedMenus)
                    saveMenuToJson(updatedMenus)
                  }
                }}
                className="px-3 py-1 border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
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
      />
    </div>
  )
}