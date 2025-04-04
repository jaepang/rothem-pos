import React from 'react'

interface CategorySelectorProps {
  categories: string[]
  selectedCategory: string
  onCategorySelect: (category: string) => void
  isEditMode: boolean
  onEditClick: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  isEditMode,
  onEditClick,
  onCancelEdit,
  onSaveEdit
}) => {
  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              disabled={isEditMode}
              className={`px-3 py-1.5 text-sm rounded-md ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => onCategorySelect(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
                onClick={onCancelEdit}
              >
                취소
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-green-500 text-white hover:bg-green-600"
                onClick={onSaveEdit}
              >
                저장
              </button>
            </>
          ) : (
            <button
              className="px-3 py-1.5 text-sm rounded-md bg-violet-500 text-white hover:bg-violet-600"
              onClick={onEditClick}
            >
              순서 편집
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 