import { useState, useEffect, useRef } from 'react'
import { MenuItem, MenuList, CategoryList } from '@/shared/types/menu'
import { loadMenuFromJson, saveMenuToJson, importMenuFromExcel, exportMenuToExcel, deleteMenuItem } from '@/shared/utils/menu'
import { saveImage } from '@/shared/utils/image'
import { loadCategories } from '@/shared/utils/category'
import { AddMenuModal } from './AddMenuModal'

export function MenuManagement() {
  const [menus, setMenus] = useState<MenuList>([])
  const [categories, setCategories] = useState<CategoryList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
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

  const handleAddMenu = (menuData: Omit<MenuItem, 'id'>) => {
    const newMenu: MenuItem = {
      ...menuData,
      id: crypto.randomUUID()
    }
    const updatedMenus = [...menus, newMenu]
    setMenus(updatedMenus)
    saveMenuToJson(updatedMenus)
  }

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

  const handleToggleFavorite = (menuId: string) => {
    const updatedMenus = menus.map((menu) =>
      menu.id === menuId ? { ...menu, isFavorite: !menu.isFavorite } : menu
    )
    setMenus(updatedMenus)
    saveMenuToJson(updatedMenus)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, menuId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imageUrl = await saveImage(file, menuId)
      const updatedMenus = menus.map((menu) =>
        menu.id === menuId ? { ...menu, imageUrl } : menu
      )
      setMenus(updatedMenus)
      saveMenuToJson(updatedMenus)
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
    }
  }

  const handleDeleteMenu = (menu: MenuItem) => {
    const updatedMenus = deleteMenuItem(menu, menus)
    setMenus(updatedMenus)
    saveMenuToJson(updatedMenus)
  }

  const categoryNames = ['all', ...categories.map(category => category.name)]
  const filteredMenus = selectedCategory === 'all'
    ? menus
    : menus.filter((menu) => menu.category === selectedCategory)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">메뉴 관리</h2>
        <div className="space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
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
        {filteredMenus.map((menu) => (
          <div
            key={menu.id}
            className="p-4 border rounded-lg space-y-2 hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-square mb-2 bg-gray-100 rounded-md overflow-hidden group">
              {menu.imageUrl ? (
                <img
                  src={menu.imageUrl}
                  alt={menu.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  이미지 없음
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, menu.id)}
                  className="hidden"
                  id={`image-upload-${menu.id}`}
                  ref={imageInputRef}
                />
                <label
                  htmlFor={`image-upload-${menu.id}`}
                  className="px-3 py-1 bg-white text-black rounded cursor-pointer"
                >
                  이미지 변경
                </label>
              </div>
            </div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{menu.name}</h3>
              <button
                onClick={() => handleToggleFavorite(menu.id)}
                className={`text-xl ${menu.isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ★
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{menu.category}</p>
            <p className="font-medium">{menu.price.toLocaleString()}원</p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleToggleSoldOut(menu.id)}
                className={`flex-1 px-3 py-1 rounded ${
                  menu.isSoldOut
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {menu.isSoldOut ? '품절' : '판매중'}
              </button>
              <button
                onClick={() => handleDeleteMenu(menu)}
                className="px-3 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddMenuModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMenu}
        categories={categories.map(category => category.name)}
      />
    </div>
  )
} 