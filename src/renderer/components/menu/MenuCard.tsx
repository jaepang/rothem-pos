import { MenuItem } from '@/shared/types/menu'
import { InventoryItem } from '@/shared/types/inventory'

interface MenuCardProps {
  menu: MenuItem & { displayName: string; priceInfo: string }
  onEdit: (menu: MenuItem) => void
  onToggleSoldOut: (menuId: string) => void
  onDelete: (menu: MenuItem) => void
  getRelatedInventory: (menuId: string) => InventoryItem[]
  getInventoryNames: (inventoryItems: InventoryItem[]) => string
  hasAllRequiredInventory: (menuId: string) => boolean
  getMissingInventory: (menuId: string) => string
}

export function MenuCard({
  menu,
  onEdit,
  onToggleSoldOut,
  onDelete,
  getRelatedInventory,
  getInventoryNames,
  hasAllRequiredInventory,
  getMissingInventory
}: MenuCardProps) {
  return (
    <div
      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer flex flex-col h-50"
      onClick={() => onEdit(menu)}
    >
      {/* 컨텐츠 영역 - flex-grow로 설정해 남은 공간을 채움 */}
      <div className="flex-grow">
        <div>
          <h3 className="font-semibold">{menu.displayName}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {menu.category}
        </p>
        <p className="font-medium">{menu.priceInfo}</p>
        
        {/* 재고 정보 */}
        {getRelatedInventory(menu.id).length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">필요 재고:</span> {getInventoryNames(getRelatedInventory(menu.id))}
          </p>
        )}
        
        {/* 부족한 재고 표시 */}
        {!hasAllRequiredInventory(menu.id) && (
          <p className="text-xs text-red-500 mt-1">
            <span className="font-medium">부족한 재고:</span> {getMissingInventory(menu.id)}
          </p>
        )}
      </div>
      
      {/* 버튼 영역 - 항상 하단에 고정 */}
      <div className="flex space-x-2 mt-3 pt-3 border-t">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSoldOut(menu.id)
          }}
          className={`flex-1 px-3 py-1 rounded transition-colors hover:opacity-90 ${
            menu.isSoldOut
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {menu.isSoldOut ? '품절' : '판매중'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(menu)
          }}
          className="px-3 py-1 border border-destructive text-destructive rounded hover:bg-destructive/10 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  )
} 