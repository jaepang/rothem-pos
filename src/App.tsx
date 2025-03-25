import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'
import MenuManagement from './components/MenuManagement'
import OrderManagement from './components/OrderManagement'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('order')

  return (
    <div className="container mx-auto p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex space-x-4 mb-4">
          <TabsTrigger value="order" className="px-4 py-2 rounded">
            주문
          </TabsTrigger>
          <TabsTrigger value="menu" className="px-4 py-2 rounded">
            메뉴 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order">
          <OrderManagement />
        </TabsContent>

        <TabsContent value="menu">
          <MenuManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default App
