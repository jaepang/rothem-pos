import { useState, useEffect } from 'react'
import { Category, CategoryList, MenuItem, MenuList } from '@/shared/types/menu'
import { loadCategories, saveCategories, addCategory, updateCategory, deleteCategory, reorderCategories } from '@/shared/utils/category'
import { loadMenuFromJson } from '@/shared/utils/menu'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export function CategoryManagement() {
  const [categories, setCategories] = useState<CategoryList>([])
  const [menus, setMenus] = useState<MenuList>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const updatedCategories = reorderCategories(
      categories,
      result.source.index,
      result.destination.index
    )
    setCategories(updatedCategories)
    await saveCategories(updatedCategories)
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">카테고리 관리</h2>
      </div>

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {categories.map((category, index) => (
                <Draggable
                  key={category.id}
                  draggableId={category.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="flex flex-col p-4 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        if (editingCategory?.id !== category.id) {
                          setEditingCategory(category)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {editingCategory?.id === category.id ? (
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
                          <span className="flex-1 font-medium">{category.name}</span>
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
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}