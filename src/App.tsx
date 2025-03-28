import React, { useState } from 'react'
import { MainLayout } from './renderer/components/layout/MainLayout'
import { OrderManagement } from './renderer/components/order/OrderManagement'
import { MenuManagement } from './renderer/components/menu/MenuManagement'
import { CategoryManagement } from './renderer/components/menu/CategoryManagement'
import { InventoryManagement } from './renderer/components/inventory/InventoryManagement'

type TabType = 'order' | 'menu' | 'category' | 'inventory'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('order')

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'order' && <OrderManagement />}
      {activeTab === 'menu' && <MenuManagement />}
      {activeTab === 'category' && <CategoryManagement />}
      {activeTab === 'inventory' && <InventoryManagement />}
    </MainLayout>
  )
}