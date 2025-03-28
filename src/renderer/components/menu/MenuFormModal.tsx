import React, { useEffect, useState } from 'react'
import { MenuItem } from '@/shared/types/menu'
import { InventoryItem } from '@/shared/types/inventory'
import { Modal } from '../ui/Modal'

interface MenuFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (menu: Omit<MenuItem, 'id'>) => void
  categories: string[]
  initialData?: MenuItem
  inventory: InventoryItem[]
}

export function MenuFormModal({ isOpen, onClose, onSubmit, categories, initialData, inventory }: MenuFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    icePrice: '',
    hotPrice: '',
    category: '음료',
    isSoldOut: false,
    isIce: false,
    isHot: false,
    relatedInventoryIds: [] as string[]
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        price: initialData.price.toString(),
        icePrice: initialData.icePrice?.toString() || '',
        hotPrice: initialData.hotPrice?.toString() || '',
        category: initialData.category,
        isSoldOut: initialData.isSoldOut,
        isIce: initialData.isIce ?? false,
        isHot: initialData.isHot ?? false,
        relatedInventoryIds: initialData.relatedInventoryIds || []
      })
    } else {
      setFormData({
        name: '',
        price: '',
        icePrice: '',
        hotPrice: '',
        category: '음료',
        isSoldOut: false,
        isIce: false,
        isHot: false,
        relatedInventoryIds: []
      })
    }
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) {
      alert('메뉴명과 카테고리를 입력해주세요.')
      return
    }

    if (formData.category === '음료') {
      if (!formData.icePrice && !formData.hotPrice) {
        alert('ICE 또는 HOT 가격을 하나 이상 입력해주세요.')
        return
      }
    } else if (!formData.price) {
      alert('가격을 입력해주세요.')
      return
    }

    const baseMenuData = {
      ...formData,
      name: formData.name,
      relatedInventoryIds: formData.relatedInventoryIds
    }

    if (formData.category === '음료') {
      const hasIce = formData.icePrice !== ''
      const hasHot = formData.hotPrice !== ''

      onSubmit({
        ...baseMenuData,
        price: hasIce ? Number(formData.icePrice) : Number(formData.hotPrice),
        icePrice: hasIce ? Number(formData.icePrice) : undefined,
        hotPrice: hasHot ? Number(formData.hotPrice) : undefined,
        isIce: hasIce,
        isHot: hasHot
      })
    } else {
      // 다른 카테고리인 경우
      onSubmit({
        ...baseMenuData,
        price: Number(formData.price),
        isIce: false,
        isHot: false,
        icePrice: undefined,
        hotPrice: undefined
      })
    }

    onClose()
  }

  const handleCategoryChange = (category: string) => {
    if (category === '음료') {
      setFormData({
        ...formData,
        category,
        hotPrice: formData.price || '',
        price: '',
      })
    } else {
      setFormData({
        ...formData,
        category,
        isIce: false,
        isHot: false,
        icePrice: '',
        hotPrice: ''
      })
    }
  }

  const handleInventorySelection = (inventoryId: string) => {
    setFormData(prev => {
      const isSelected = prev.relatedInventoryIds.includes(inventoryId)
      const updatedIds = isSelected
        ? prev.relatedInventoryIds.filter(id => id !== inventoryId)
        : [...prev.relatedInventoryIds, inventoryId]
      
      return {
        ...prev,
        relatedInventoryIds: updatedIds
      }
    })
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? '메뉴 수정' : '메뉴 추가'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">메뉴명</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">카테고리</label>
          <select
            value={formData.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">카테고리 선택</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {formData.category === '음료' ? (
          <div className="space-y-4">
            <p className="text-sm text-red-500 font-medium">* 가격을 명시한 항목만 등록됩니다</p>
            <div className="flex space-x-4">
              <div className="flex-1 space-y-2">
                <div>
                  <label className="block text-sm font-medium mb-1">ICE 가격</label>
                  <input
                    type="number"
                    value={formData.icePrice}
                    onChange={(e) => setFormData({
                      ...formData,
                      icePrice: e.target.value,
                      isIce: e.target.value !== ''
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div>
                  <label className="block text-sm font-medium mb-1">HOT 가격</label>
                  <input
                    type="number"
                    value={formData.hotPrice}
                    onChange={(e) => setFormData({
                      ...formData,
                      hotPrice: e.target.value,
                      isHot: e.target.value !== ''
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">가격</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium">필요한 재고 선택</label>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2">
            {inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 재고가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {inventory.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`inventory-${item.id}`}
                      checked={formData.relatedInventoryIds.includes(item.id)}
                      onChange={() => handleInventorySelection(item.id)}
                      className="mr-2"
                    />
                    <label 
                      htmlFor={`inventory-${item.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {item.name} ({item.quantity} {item.unit})
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <span className="block text-sm font-medium">품절</span>
          </div>
          <div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isSoldOut}
              onClick={() => setFormData({ ...formData, isSoldOut: !formData.isSoldOut })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isSoldOut ? 'bg-destructive' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isSoldOut ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {initialData ? '수정' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  )
} 