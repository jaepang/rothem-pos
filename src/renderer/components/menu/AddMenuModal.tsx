import { useState, useEffect } from 'react'
import { MenuItem } from '@/shared/types/menu'
import { createPortal } from 'react-dom'

interface AddMenuModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (menu: Omit<MenuItem, 'id'>) => void
  categories: string[]
}

export function AddMenuModal({ isOpen, onClose, onAdd, categories }: AddMenuModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    icePrice: '',
    hotPrice: '',
    category: '',
    isSoldOut: false,
    isFavorite: false,
    isIce: false,
    isHot: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) {
      alert('메뉴명과 카테고리를 입력해주세요.')
      return
    }

    if (formData.category === '음료') {
      if (!formData.isIce && !formData.isHot) {
        alert('음료는 ICE/HOT 중 하나 이상을 선택해야 합니다.')
        return
      }
      if (formData.isIce && !formData.icePrice) {
        alert('ICE 음료의 가격을 입력해주세요.')
        return
      }
      if (formData.isHot && !formData.hotPrice) {
        alert('HOT 음료의 가격을 입력해주세요.')
        return
      }
    } else if (!formData.price) {
      alert('가격을 입력해주세요.')
      return
    }

    if (formData.category === '음료') {
      if (formData.isIce && formData.isHot) {
        // ICE/HOT 모두 있는 경우
        onAdd({
          ...formData,
          name: formData.name,
          price: Number(formData.icePrice),
          imageUrl: '',
          isIce: true,
          isHot: true
        })
      } else if (formData.isIce) {
        // ICE만 있는 경우
        onAdd({
          ...formData,
          name: formData.name,
          price: Number(formData.icePrice),
          imageUrl: '',
          isIce: true,
          isHot: false
        })
      } else if (formData.isHot) {
        // HOT만 있는 경우
        onAdd({
          ...formData,
          name: formData.name,
          price: Number(formData.hotPrice),
          imageUrl: '',
          isIce: false,
          isHot: true
        })
      }
    } else {
      // 다른 카테고리인 경우
      onAdd({
        ...formData,
        name: formData.name,
        price: Number(formData.price),
        imageUrl: '',
        isIce: false,
        isHot: false
      })
    }

    setFormData({
      name: '',
      price: '',
      icePrice: '',
      hotPrice: '',
      category: '',
      isSoldOut: false,
      isFavorite: false,
      isIce: false,
      isHot: false
    })
    onClose()
  }

  const handleCategoryChange = (category: string) => {
    if (category === '음료') {
      setFormData({
        ...formData,
        category,
        hotPrice: formData.price || '', // 기존 가격을 HOT 가격으로 설정
        price: '', // 일반 가격 필드 초기화
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

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">새 메뉴 추가</h3>
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
              <div className="flex space-x-4">
                <div className="flex-1 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isIce}
                      onChange={(e) => setFormData({ ...formData, isIce: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">ICE</span>
                  </label>
                  <div className="h-[42px]">
                    {formData.isIce && (
                      <input
                        type="number"
                        value={formData.icePrice}
                        onChange={(e) => setFormData({ ...formData, icePrice: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="ICE 가격"
                        required
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isHot}
                      onChange={(e) => setFormData({ ...formData, isHot: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">HOT</span>
                  </label>
                  <div className="h-[42px]">
                    {formData.isHot && (
                      <input
                        type="number"
                        value={formData.hotPrice}
                        onChange={(e) => setFormData({ ...formData, hotPrice: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="HOT 가격"
                        required
                      />
                    )}
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
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isSoldOut}
                onChange={(e) => setFormData({ ...formData, isSoldOut: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">품절</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isFavorite}
                onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">즐겨찾기</span>
            </label>
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
              추가
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
} 