import { useState, useEffect, useMemo } from 'react'
import { InventoryItem } from '@/shared/types/inventory'
import { MenuItem } from '@/shared/types/menu'
import { Modal } from '../ui/Modal'

interface InventoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (inventoryData: Omit<InventoryItem, 'id'>) => void
  menuList: MenuItem[]
  initialData?: InventoryItem
}

export function InventoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  menuList,
  initialData
}: InventoryFormModalProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [relatedMenuIds, setRelatedMenuIds] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')

  // 카테고리 목록 생성
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(menuList.map(menu => menu.category)))
    return ['전체', ...uniqueCategories]
  }, [menuList])

  // 카테고리별 메뉴 수를 계산하고 정렬된 메뉴 목록 생성
  const sortedMenuList = useMemo(() => {
    // 카테고리별 메뉴 수 계산
    const categoryCounts = menuList.reduce((acc, menu) => {
      acc[menu.category] = (acc[menu.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 카테고리를 메뉴 수 기준으로 정렬
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category)

    // 정렬된 카테고리 순서대로 메뉴 정렬
    return [...menuList].sort((a, b) => {
      const aIndex = sortedCategories.indexOf(a.category)
      const bIndex = sortedCategories.indexOf(b.category)
      if (aIndex === bIndex) {
        return a.name.localeCompare(b.name)
      }
      return aIndex - bIndex
    })
  }, [menuList])

  // 선택된 카테고리에 따라 메뉴 필터링
  const filteredMenuList = useMemo(() => {
    const filtered = selectedCategory === '전체' 
      ? sortedMenuList 
      : sortedMenuList.filter(menu => menu.category === selectedCategory)

    // 선택된 메뉴를 먼저 보여주기 위해 정렬
    return filtered.sort((a, b) => {
      const aSelected = relatedMenuIds.includes(a.id)
      const bSelected = relatedMenuIds.includes(b.id)
      if (aSelected === bSelected) {
        // 둘 다 선택되었거나 선택되지 않은 경우 기존 정렬 유지
        const aIndex = sortedMenuList.findIndex(m => m.id === a.id)
        const bIndex = sortedMenuList.findIndex(m => m.id === b.id)
        return aIndex - bIndex
      }
      return aSelected ? -1 : 1
    })
  }, [sortedMenuList, selectedCategory, relatedMenuIds])

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setUnit(initialData.unit)
      setQuantity(initialData.quantity)
      setRelatedMenuIds(initialData.relatedMenuIds)
    } else {
      // 새 아이템 등록 시 초기화
      setName('')
      setUnit('')
      setQuantity(0)
      setRelatedMenuIds([])
    }
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      unit,
      quantity,
      relatedMenuIds
    })
  }

  const handleMenuSelection = (menuId: string) => {
    setRelatedMenuIds(prev => 
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? '재고 수정' : '재고 추가'}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">단위</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
            placeholder="팩, 병, kg 등"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">수량</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-md"
            min="0"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">연관된 메뉴</label>
            <div className="flex space-x-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setSelectedCategory(category)
                  }}
                  className={`px-2 py-1 text-sm whitespace-nowrap relative ${
                    selectedCategory === category
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {category}
                  {selectedCategory === category && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
            {menuList.length === 0 ? (
              <p className="text-gray-500">등록된 메뉴가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredMenuList.map((menu) => (
                  <div
                    key={menu.id}
                    onClick={() => handleMenuSelection(menu.id)}
                    className={`p-2 rounded-md cursor-pointer transition-all ${
                      relatedMenuIds.includes(menu.id)
                        ? 'border-2 border-green-500 bg-green-50'
                        : 'border border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{menu.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {menu.category}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            {initialData ? '수정' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  )
} 