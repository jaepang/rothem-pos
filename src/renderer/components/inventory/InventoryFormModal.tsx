import { useState, useEffect } from 'react'
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
          <label className="block text-sm font-medium mb-1">연관된 메뉴</label>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
            {menuList.length === 0 ? (
              <p className="text-gray-500">등록된 메뉴가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {menuList.map((menu) => (
                  <div key={menu.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`menu-${menu.id}`}
                      checked={relatedMenuIds.includes(menu.id)}
                      onChange={() => handleMenuSelection(menu.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`menu-${menu.id}`} className="text-sm">
                      {menu.name}
                    </label>
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