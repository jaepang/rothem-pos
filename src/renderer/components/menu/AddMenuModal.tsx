import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MenuItem } from '@/shared/types/menu'

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
    category: '',
    isSoldOut: false,
    isFavorite: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price || !formData.category) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    onAdd({
      ...formData,
      price: Number(formData.price),
      imageUrl: ''
    })

    setFormData({
      name: '',
      price: '',
      category: '',
      isSoldOut: false,
      isFavorite: false
    })
    onClose()
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
            <label className="block text-sm font-medium mb-1">가격</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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