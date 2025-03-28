import { useState, useEffect, useRef } from 'react'
import { InventoryItem, InventoryList } from '@/shared/types/inventory'
import { MenuList } from '@/shared/types/menu'
import { 
  loadInventoryFromJson, 
  saveInventoryToJson, 
  updateInventoryQuantity,
  importInventoryFromExcel,
  exportInventoryToExcel,
  updateMenuSoldOutStatus
} from '@/shared/utils/inventory'
import { loadMenuFromJson, saveMenuToJson } from '@/shared/utils/menu'
import { InventoryFormModal } from './InventoryFormModal'

export function InventoryManagement() {
  const [inventory, setInventory] = useState<InventoryList>([])
  const [menus, setMenus] = useState<MenuList>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>(undefined)
  const excelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const [loadedInventory, loadedMenus] = await Promise.all([
        loadInventoryFromJson(),
        loadMenuFromJson()
      ])
      setInventory(loadedInventory)
      setMenus(loadedMenus)
    }
    loadData()
  }, [])

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return

    // 재고 수량 업데이트
    const updatedInventory = updateInventoryQuantity(inventory, itemId, newQuantity)
    setInventory(updatedInventory)
    await saveInventoryToJson(updatedInventory)

    // 메뉴 품절 상태 업데이트
    const updatedMenus = updateMenuSoldOutStatus(updatedInventory, menus)
    setMenus(updatedMenus)
    await saveMenuToJson(updatedMenus)
  }

  const handleDirectQuantityChange = async (itemId: string, value: string) => {
    const parsedValue = parseInt(value)
    if (isNaN(parsedValue) || parsedValue < 0) return
    
    await handleQuantityChange(itemId, parsedValue)
  }

  const handleExportInventory = () => {
    if (inventory.length === 0) {
      alert('내보낼 재고가 없습니다.')
      return
    }
    exportInventoryToExcel(inventory)
  }

  const handleImportInventory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const importedInventory = await importInventoryFromExcel(file)
      setInventory(importedInventory)
      await saveInventoryToJson(importedInventory)
      
      // 메뉴 품절 상태 업데이트
      const updatedMenus = updateMenuSoldOutStatus(importedInventory, menus)
      setMenus(updatedMenus)
      await saveMenuToJson(updatedMenus)
      
      alert(`${importedInventory.length}개의 재고 항목을 가져왔습니다.`)
    } catch {
      alert('재고 데이터를 가져오는데 실패했습니다.')
    } finally {
      if (excelInputRef.current) {
        excelInputRef.current.value = ''
      }
    }
  }

  const handleSubmitInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
    let updatedInventory: InventoryList

    if (selectedItem) {
      // 재고 항목 수정
      updatedInventory = inventory.map(item =>
        item.id === selectedItem.id
          ? { ...itemData, id: item.id }
          : item
      )
    } else {
      // 새 재고 항목 추가
      const newItem = {
        ...itemData,
        id: Date.now().toString()
      }
      updatedInventory = [...inventory, newItem]
    }

    setInventory(updatedInventory)
    await saveInventoryToJson(updatedInventory)

    // 메뉴 품절 상태 업데이트
    const updatedMenus = updateMenuSoldOutStatus(updatedInventory, menus)
    setMenus(updatedMenus)
    await saveMenuToJson(updatedMenus)

    setIsAddModalOpen(false)
    setSelectedItem(undefined)
  }

  const handleDeleteInventoryItem = async (itemId: string) => {
    if (!confirm('이 재고 항목을 삭제하시겠습니까?')) return

    const updatedInventory = inventory.filter(item => item.id !== itemId)
    setInventory(updatedInventory)
    await saveInventoryToJson(updatedInventory)

    // 메뉴 품절 상태 업데이트
    const updatedMenus = updateMenuSoldOutStatus(updatedInventory, menus)
    setMenus(updatedMenus)
    await saveMenuToJson(updatedMenus)
  }

  // 특정 재고와 관련된 메뉴 이름 목록 가져오기
  const getRelatedMenuNames = (relatedMenuIds: string[]) => {
    return relatedMenuIds
      .map(id => menus.find(menu => menu.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  // 특정 재고와 관련된 메뉴 중 품절된 메뉴 개수 가져오기
  const getSoldOutCount = (relatedMenuIds: string[]) => {
    const relatedMenus = menus.filter(menu => relatedMenuIds.includes(menu.id))
    return relatedMenus.filter(menu => menu.isSoldOut).length
  }

  // 연관된 메뉴 목록 가져오기
  const getRelatedMenus = (relatedMenuIds: string[]) => {
    return menus.filter(menu => relatedMenuIds.includes(menu.id))
  }

  // 특정 메뉴의 품절 상태 반환
  const isMenuSoldOut = (menuId: string) => {
    const menu = menus.find(menu => menu.id === menuId)
    return menu?.isSoldOut
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">재고 관리</h2>
        <div className="space-x-2">
          <button
            onClick={() => {
              setSelectedItem(undefined)
              setIsAddModalOpen(true)
            }}
            className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-primary/90"
          >
            재고 추가
          </button>
          <button
            onClick={handleExportInventory}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            엑셀 내보내기
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportInventory}
            className="hidden"
          />
          <button
            onClick={() => excelInputRef.current?.click()}
            className="px-4 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
          >
            엑셀 가져오기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((item) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg space-y-3 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedItem(item)
              setIsAddModalOpen(true)
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-sm text-muted-foreground">단위: {item.unit}</p>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedItem(item)
                    setIsAddModalOpen(true)
                  }}
                  className="p-1.5 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                >
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteInventoryItem(item.id)
                  }}
                  className="p-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                >
                  삭제
                </button>
              </div>
            </div>

            {item.relatedMenuIds.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">품절된 메뉴:</span> {getSoldOutCount(item.relatedMenuIds)}개 / {item.relatedMenuIds.length}개
                </p>
                <div className="grid grid-cols-3 gap-1 max-h-20 overflow-y-auto">
                  {getRelatedMenus(item.relatedMenuIds).map(menu => (
                    <div 
                      key={menu.id} 
                      className={`px-1.5 py-0.5 text-xs rounded-sm text-center truncate ${
                        menu.isSoldOut ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {menu.name}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuantityChange(item.id, item.quantity - 1)
                }}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
                disabled={item.quantity <= 0}
              >
                -
              </button>
              <input
                type="text"
                value={item.quantity}
                onChange={(e) => {
                  const onlyNumbers = e.target.value.replace(/[^0-9]/g, '')
                  handleDirectQuantityChange(item.id, onlyNumbers)
                }}
                className="w-16 px-2 py-1 text-center border rounded-md"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuantityChange(item.id, item.quantity + 1)
                }}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300"
              >
                +
              </button>
              <span className="text-gray-600 ml-1">{item.unit}</span>
            </div>

            {item.quantity <= 0 && (
              <p className="text-destructive font-medium">품절</p>
            )}
          </div>
        ))}

        {inventory.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">
            등록된 재고가 없습니다. '재고 추가' 버튼을 클릭하여 재고를 추가해 주세요.
          </div>
        )}
      </div>

      <InventoryFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setSelectedItem(undefined)
        }}
        onSubmit={handleSubmitInventoryItem}
        menuList={menus}
        initialData={selectedItem}
      />
    </div>
  )
} 