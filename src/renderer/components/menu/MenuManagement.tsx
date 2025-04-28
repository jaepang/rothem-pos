import React from 'react'
import { useMenuManagement } from '@/renderer/hooks/useMenuManagement'
import { CategoryFilter } from './CategoryFilter'
import { MenuActions } from './MenuActions'
import { MenuGrid } from './MenuGrid'
import { MenuFormModal } from './MenuFormModal'

export function MenuManagement() {
  const {
    selectedCategory,
    setSelectedCategory,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedMenu,
    setSelectedMenu,
    excelInputRef,
    handleExportMenus,
    handleImportMenus,
    handleToggleSoldOut,
    handleSubmitMenu,
    handleEditMenu,
    handleDeleteMenu,
    getRelatedInventory,
    getInventoryNames,
    hasAllRequiredInventory,
    getMissingInventory,
    getDisplayMenus,
    getCategoryNames,
    categories,
    inventory
  } = useMenuManagement()

  const handleImportMenusEvent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const success = await handleImportMenus(file)
      if (success) {
        alert(`메뉴를 성공적으로 가져왔습니다.`)
      } else {
        alert('메뉴를 가져오는데 실패했습니다.')
      }
      
      // 파일 입력 초기화
      if (excelInputRef.current) {
        excelInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-3xl font-bold">메뉴 관리</h2>
          <CategoryFilter
            categories={getCategoryNames()}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
        <MenuActions
          onAddMenu={() => {
            setSelectedMenu(undefined)
            setIsAddModalOpen(true)
          }}
          onExportMenus={handleExportMenus}
          excelInputRef={excelInputRef}
          onImportMenus={handleImportMenusEvent}
        />
      </div>

      <MenuGrid
        menus={getDisplayMenus()}
        onEdit={handleEditMenu}
        onToggleSoldOut={handleToggleSoldOut}
        onDelete={handleDeleteMenu}
        getRelatedInventory={getRelatedInventory}
        getInventoryNames={getInventoryNames}
        hasAllRequiredInventory={hasAllRequiredInventory}
        getMissingInventory={getMissingInventory}
      />

      <MenuFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setSelectedMenu(undefined)
        }}
        onSubmit={handleSubmitMenu}
        categories={categories.map(category => category.name)}
        initialData={selectedMenu}
        inventory={inventory}
      />
    </div>
  )
}