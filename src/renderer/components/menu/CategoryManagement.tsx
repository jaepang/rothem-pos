import { useState, useEffect } from 'react'
import { Category, CategoryList } from '@/shared/types/menu'
import { loadCategories, saveCategories, addCategory, updateCategory, deleteCategory, reorderCategories } from '@/shared/utils/category'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

export function CategoryManagement() {
  const [categories, setCategories] = useState<CategoryList>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    const loadCategoryData = async () => {
      const loadedCategories = await loadCategories()
      setCategories(loadedCategories)
    }
    loadCategoryData()
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
              className="space-y-2"
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
                      className="flex items-center justify-between p-4 bg-background border rounded-lg"
                    >
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
                        <span className="flex-1">{category.name}</span>
                      )}
                      <div className="flex space-x-2">
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