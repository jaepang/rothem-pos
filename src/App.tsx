import React, { useState } from 'react'
import { MainLayout } from './renderer/components/layout/MainLayout'
import { OrderManagement } from './renderer/components/order/OrderManagement'
import { MenuManagement } from './renderer/components/menu/MenuManagement'
import { CategoryManagement } from './renderer/components/menu/CategoryManagement'
import { InventoryManagement } from './renderer/components/inventory/InventoryManagement'
import { OrderHistory } from './renderer/components/order/OrderHistory'
import { SettingsPage } from './renderer/components/settings/SettingsPage'

type TabType = 'order' | 'menu' | 'category' | 'inventory' | 'history' | 'settings'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('order')

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'order' && <OrderManagement />}
      {activeTab === 'menu' && <MenuManagement />}
      {activeTab === 'category' && <CategoryManagement />}
      {activeTab === 'inventory' && <InventoryManagement />}
      {activeTab === 'history' && <OrderHistory />}
      {activeTab === 'settings' && <SettingsPage />}
    </MainLayout>
  )
}