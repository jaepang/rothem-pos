import React from 'react'

type TabType = 'order' | 'menu' | 'category' | 'inventory'

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="px-6 flex h-[6vh] items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center">
            Rothem POS
            <img 
              src="/images/tree.png" 
              alt="tree" 
              className="h-[0.85em] w-auto ml-1.5 -translate-y-[1px]" 
            />
          </h1>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onTabChange('order')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'order'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              }`}
            >
              주문
            </button>
            <button
              onClick={() => onTabChange('menu')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'menu'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              }`}
            >
              메뉴 관리
            </button>
            <button
              onClick={() => onTabChange('category')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'category'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              }`}
            >
              카테고리 관리
            </button>
            <button
              onClick={() => onTabChange('inventory')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'inventory'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
              }`}
            >
              재고 관리
            </button>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  )
}

export { MainLayout } 