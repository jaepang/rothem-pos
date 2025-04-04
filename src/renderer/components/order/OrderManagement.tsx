import React from 'react'
import { MenuItem } from '@/shared/types/menu'
import { useMenu } from '@/renderer/hooks/useMenu'
import { useOrderItems } from '@/renderer/hooks/useOrderItems'
import { useOrders } from '@/renderer/hooks/useOrders'
import { usePrinter } from '@/renderer/hooks/usePrinter'
import { CategorySelector } from './CategorySelector'
import { MenuGrid } from './MenuGrid'
import { OrderSummary } from './OrderSummary'
import { OrdersList } from './OrdersList'

const OrderManagement: React.FC = () => {
  // 커스텀 훅 사용
  const { 
    isPrinterConnected 
  } = usePrinter()
  
  const {
    menus,
    selectedCategory,
    setSelectedCategory,
    isEditMode,
    setIsEditMode,
    selectedCardIndex,
    selectedOriginalId,
    getOriginalId,
    getCategories,
    getDisplayMenus,
    handleOrderChange,
    handleSaveOrder,
    handleCancelEdit
  } = useMenu()
  
  const {
    orderItems,
    memo,
    setMemo,
    handleAddItem,
    handleUpdateQuantity,
    hasSoldOutItems,
    getTotalAmount,
    clearOrderItems
  } = useOrderItems(getOriginalId, menus)
  
  const {
    showCompletedOrders,
    setShowCompletedOrders,
    handleCreateOrder,
    handleCompleteOrder,
    handleCancelOrder,
    handleDeleteOrder,
    getPendingOrders,
    getCompletedOrders
  } = useOrders(isPrinterConnected)
  
  // 카테고리 목록 가져오기
  const categories = getCategories()
  
  // 표시할 메뉴 목록 가져오기
  const displayMenus = getDisplayMenus()
  
  // 처리 중인 주문 목록 가져오기
  const pendingOrders = getPendingOrders()
  
  // 완료된 주문 목록 가져오기
  const completedOrders = getCompletedOrders()
  
  // 메뉴 카드 클릭 핸들러
  const handleMenuCardClick = (index: number, menu: MenuItem) => {
    if (isEditMode) {
      handleOrderChange(index)
    } else {
      if (!menu.isSoldOut) {
        handleAddItem(menu)
      }
    }
  }
  
  // 순서 편집 모드 토글
  const handleEditModeToggle = () => {
    // orderItems가 비어있지 않으면 초기화
    if (orderItems.length > 0) {
      clearOrderItems()
    }
    setIsEditMode(true)
  }
  
  // 주문 생성
  const createOrder = async () => {
    const order = await handleCreateOrder(orderItems, memo, hasSoldOutItems())
    if (order) {
      clearOrderItems()
    }
  }

  return (
    <div className="h-[calc(94vh-0.1rem)] w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
      <div className={`${showCompletedOrders ? 'lg:col-span-6' : 'lg:col-span-9'} transition-all duration-300 overflow-hidden`}>
        <div className="h-full overflow-y-auto">
          <div className="space-y-6 pb-6">
            <CategorySelector 
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              isEditMode={isEditMode}
              onEditClick={handleEditModeToggle}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveOrder}
            />

            <div>
              <MenuGrid 
                displayMenus={displayMenus}
                orderItems={orderItems}
                isEditMode={isEditMode}
                selectedCardIndex={selectedCardIndex}
                selectedOriginalId={selectedOriginalId}
                getOriginalId={getOriginalId}
                showCompletedOrders={showCompletedOrders}
                onMenuCardClick={handleMenuCardClick}
                onUpdateQuantity={handleUpdateQuantity}
              />

              <OrderSummary 
                orderItems={orderItems}
                menus={menus}
                memo={memo}
                onMemoChange={setMemo}
                onUpdateQuantity={handleUpdateQuantity}
                onClearOrderItems={clearOrderItems}
                onCreateOrder={createOrder}
                isEditMode={isEditMode}
                hasSoldOutItems={hasSoldOutItems()}
                totalAmount={getTotalAmount()}
                getOriginalId={getOriginalId}
              />
            </div>
          </div>
        </div>
      </div>

      <OrdersList 
        orders={pendingOrders}
        title="처리중인 주문"
        onComplete={handleCompleteOrder}
        onCancel={handleCancelOrder}
        withToggleButton
        onToggleShowCompleted={() => setShowCompletedOrders(!showCompletedOrders)}
        showCompletedOrders={showCompletedOrders}
        emptyMessage="처리중인 주문이 없습니다"
      />

      <OrdersList 
        orders={completedOrders}
        title="완료된 주문"
        onComplete={handleCompleteOrder}
        onCancel={handleCancelOrder}
        onDelete={handleDeleteOrder}
        showList={showCompletedOrders}
        emptyMessage="완료된 주문이 없습니다"
      />
    </div>
  )
}

export { OrderManagement }