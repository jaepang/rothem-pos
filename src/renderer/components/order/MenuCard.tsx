import React from 'react'
import { MenuItem } from '@/shared/types/menu'

interface MenuCardProps {
  menu: MenuItem
  isSelected: boolean
  selectedQuantity: number | null
  isEditMode: boolean
  isCardSelected: boolean
  onCardClick: () => void
  onIncrease?: (e: React.MouseEvent) => void
  onDecrease?: (e: React.MouseEvent) => void
}

export const MenuCard: React.FC<MenuCardProps> = ({
  menu,
  isSelected,
  selectedQuantity,
  isEditMode,
  isCardSelected,
  onCardClick,
  onIncrease,
  onDecrease
}) => {
  return (
    <button
      className={`p-3 bg-white border rounded-lg shadow-sm 
        ${menu.isSoldOut 
          ? 'opacity-50 cursor-not-allowed border-red-300 bg-red-50' 
          : isSelected && !isEditMode
            ? 'border-blue-500 border-2 shadow-md bg-blue-50'
            : isCardSelected
              ? 'border-violet-500 border-2 shadow-md bg-violet-50'
              : isEditMode
                ? 'border-dashed border-gray-400 hover:border-violet-300'
                : 'hover:shadow-md transition-shadow'}`}
      onClick={onCardClick}
      disabled={!isEditMode && menu.isSoldOut}
    >
      <div className="font-bold text-left">
        {menu.displayName}
        {menu.isSoldOut && <span className="text-red-500 ml-1">(품절)</span>}
        {isEditMode && <span className="text-gray-500 ml-1">#{menu.order || 0}</span>}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-gray-600">{menu.price.toLocaleString()}원</div>
        {isSelected && selectedQuantity !== null && !isEditMode && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full hover:bg-blue-200 text-blue-600 cursor-pointer"
              onClick={onDecrease}
            >
              -
            </div>
            <span className="w-6 text-center text-blue-600 font-medium">{selectedQuantity}</span>
            <div
              className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full hover:bg-blue-200 text-blue-600 cursor-pointer"
              onClick={onIncrease}
              aria-disabled={menu.isSoldOut}
              style={menu.isSoldOut ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              +
            </div>
          </div>
        )}
      </div>
    </button>
  )
} 