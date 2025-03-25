import { useState } from 'react';
import { MainLayout } from './renderer/components/layout/MainLayout';
import { MenuManagement } from './renderer/components/menu/MenuManagement';
import { OrderManagement } from './renderer/components/order/OrderManagement';

function App() {
  const [activeTab, setActiveTab] = useState<'menu' | 'order'>('order');

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('order')}
            className={`px-4 py-2 -mb-px ${
              activeTab === 'order'
                ? 'border-b-2 border-primary font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            주문
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 -mb-px ${
              activeTab === 'menu'
                ? 'border-b-2 border-primary font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            메뉴 관리
          </button>
        </div>

        {activeTab === 'menu' ? <MenuManagement /> : <OrderManagement />}
      </div>
    </MainLayout>
  );
}

export default App;
