import { useState, useEffect } from 'react'
import { Category, CategoryList, MenuItem, MenuList } from '@/shared/types/menu'
import { loadCategories, saveCategories, addCategory, updateCategory, deleteCategory, reorderCategories } from '@/shared/utils/category'
import { loadMenuFromJson } from '@/shared/utils/menu'

export function CategoryManagement() {
  const [categories, setCategories] = useState<CategoryList>([])
  const [menus, setMenus] = useState<MenuList>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const loadedMenus = await loadMenuFromJson()
      
      const loadedCategories = await loadCategories(loadedMenus)
      
      setCategories(loadedCategories)
      setMenus(loadedMenus)
    }
    loadData()
  }, [])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    const updatedCategories = addCategory(categories, newCategoryName.trim())
    setCategories(updatedCategories)
    await saveCategories(updatedCategories)
    setNewCategoryName('')
  }

  const handleUpdateCategory = async (category: Category) => {
    const updatedCategories = updateCategory(categories, category)
    setCategories(updatedCategories)
    await saveCategories(updatedCategories)
    setEditingCategory(null)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return

    const updatedCategories = deleteCategory(categories, categoryId)
    setCategories(updatedCategories)
    await saveCategories(updatedCategories)
  }

  const handleEditModeToggle = () => {
    setIsEditMode(prevMode => !prevMode)
    setSelectedCategoryIndex(null)
  }

  const handleCategorySelect = (index: number) => {
    if (!isEditMode) return
    setSelectedCategoryIndex(index === selectedCategoryIndex ? null : index)
  }

  const handleMoveCategory = (direction: 'up' | 'down') => {
    if (selectedCategoryIndex === null) return
    
    const sourceIndex = selectedCategoryIndex
    const destinationIndex = direction === 'up' 
      ? Math.max(0, sourceIndex - 1) 
      : Math.min(categories.length - 1, sourceIndex + 1)
    
    if (sourceIndex === destinationIndex) return
    
    const updatedCategories = reorderCategories(
      categories,
      sourceIndex,
      destinationIndex
    )
    
    setCategories(updatedCategories)
    setSelectedCategoryIndex(destinationIndex)
  }

  const handleSaveOrder = async () => {
    await saveCategories(categories)
    setIsEditMode(false)
    setSelectedCategoryIndex(null)
  }

  const handleCancelEdit = () => {
    loadData()
    setIsEditMode(false)
    setSelectedCategoryIndex(null)
  }

  const loadData = async () => {
    const loadedMenus = await loadMenuFromJson()
    const loadedCategories = await loadCategories(loadedMenus)
    setCategories(loadedCategories)
    setMenus(loadedMenus)
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">카테고리 관리</h2>
        <div className="flex space-x-2">
          {isEditMode ? (
            <>
              <button
                onClick={handleSaveOrder}
                className="px-4 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
              >
                저장
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
              >
                취소
              </button>
            </>
          ) : (
            <button
              onClick={handleEditModeToggle}
              className="px-4 py-2 text-sm text-white bg-violet-500 rounded hover:bg-violet-600"
            >
              순서 편집
            </button>
          )}
        </div>
      </div>

      {!isEditMode && (
        <form onSubmit={handleAddCategory} className="flex space-x-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="새 카테고리 이름"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-primary/90"
          >
            추가
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className={`flex flex-col p-4 bg-background rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer
              ${isEditMode && selectedCategoryIndex === index 
                ? 'border-solid border ring-1 ring-violet-500 border-violet-500' 
                : isEditMode 
                  ? 'border-dashed border-2 border-gray-300' 
                  : 'border border-solid'
              }
            `}
            onClick={() => {
              if (isEditMode) {
                handleCategorySelect(index)
              } else if (editingCategory?.id !== category.id) {
                setEditingCategory(category)
              }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              {editingCategory?.id === category.id && !isEditMode ? (
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value
                    })
                  }
                  className="flex-1 px-3 py-2 border rounded-md mr-2"
                  autoFocus
                />
              ) : (
                <span className="flex-1 font-medium">
                  {isEditMode && selectedCategoryIndex === index && (
                    <span className="text-violet-500 mr-2">►</span>
                  )}
                  {category.name}
                </span>
              )}
            </div>
            <div className="mt-2 mb-4">
              <div className="text-sm text-muted-foreground mb-1">메뉴 목록</div>
              <div className="space-y-1">
                {menus
                  .filter(menu => menu.category === category.name)
                  .map(menu => (
                    <div key={menu.id} className="text-sm flex justify-between items-center">
                      <span>{menu.name}</span>
                      <span className="text-muted-foreground">
                        {menu.category === '음료' ? (
                          <>
                            {menu.isIce && <span>ICE {menu.icePrice?.toLocaleString()}원</span>}
                            {menu.isIce && menu.isHot && <span className="mx-1">/</span>}
                            {menu.isHot && <span>HOT {menu.hotPrice?.toLocaleString()}원</span>}
                          </>
                        ) : (
                          `${menu.price.toLocaleString()}원`
                        )}
                      </span>
                    </div>
                  ))}
                {menus.filter(menu => menu.category === category.name).length === 0 && (
                  <div className="text-sm text-muted-foreground">메뉴가 없습니다</div>
                )}
              </div>
            </div>
            {!isEditMode && (
              <div className="flex justify-end space-x-2 mt-auto">
                {editingCategory?.id === category.id ? (
                  <>
                    <button
                      onClick={() =>
                        handleUpdateCategory(editingCategory)
                      }
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}