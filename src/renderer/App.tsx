import React, { useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { OrderManagement } from './components/order/OrderManagement'
import { MenuManagement } from './components/menu/MenuManagement'
import { CategoryManagement } from './components/menu/CategoryManagement'

type TabType = 'order' | 'menu' | 'category'

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('order')

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'order' && <OrderManagement />}
      {activeTab === 'menu' && <MenuManagement />}
      {activeTab === 'category' && <CategoryManagement />}
    </MainLayout>
  )
}