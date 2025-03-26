import { useState } from 'react'
import { MenuManagement } from './components/menu/MenuManagement'
import { CategoryManagement } from './components/menu/CategoryManagement'

export function App() {
  const [activeTab, setActiveTab] = useState<'order' | 'menu' | 'category'>('order')

  const renderContent = () => {
    switch (activeTab) {
      case 'menu':
        return <MenuManagement />
      case 'category':
        return <CategoryManagement />
      default:
        return <div>주문 화면</div>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('order')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'order'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
          >
            주문
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'menu'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
          >
            메뉴 관리
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'category'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
          >
            카테고리 관리
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  )
} 