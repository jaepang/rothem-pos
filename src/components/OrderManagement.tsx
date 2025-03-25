import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { MenuItem, Order, OrderItem } from '../types/menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';

const OrderManagement: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    const result = await ipcRenderer.invoke('load-menu');
    if (result.success && Array.isArray(result.data)) {
      const menuData = result.data as MenuItem[];
      setMenus(menuData);
      const uniqueCategories = [...new Set(menuData.map(menu => menu.category))];
      setCategories(uniqueCategories);
    }
  };

  const addToOrder = (menu: MenuItem) => {
    if (menu.isSoldOut) return;

    const existingItem = selectedItems.find(item => item.menuItem.id === menu.id);
    if (existingItem) {
      setSelectedItems(selectedItems.map(item =>
        item.menuItem.id === menu.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, { menuItem: menu, quantity: 1 }]);
    }
  };

  const removeFromOrder = (menuId: string) => {
    setSelectedItems(selectedItems.filter(item => item.menuItem.id !== menuId));
  };

  const updateQuantity = (menuId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(menuId);
      return;
    }

    setSelectedItems(selectedItems.map(item =>
      item.menuItem.id === menuId
        ? { ...item, quantity }
        : item
    ));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => 
      total + (item.menuItem.price * item.quantity), 0
    );
  };

  const handlePrint = async () => {
    if (selectedItems.length === 0) return;

    const order: Order = {
      id: crypto.randomUUID(),
      items: selectedItems,
      totalPrice: calculateTotal(),
      orderTime: new Date().toISOString()
    };

    const result = await ipcRenderer.invoke('print-order', order);
    if (result.success) {
      setSelectedItems([]);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-2/3 p-4">
        <Tabs defaultValue="favorites">
          <TabsList>
            <TabsTrigger value="favorites">즐겨찾기</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>

          <TabsContent value="favorites">
            <div className="grid grid-cols-4 gap-4">
              {menus.filter(menu => menu.isFavorite).map(menu => (
                <button
                  key={menu.id}
                  onClick={() => addToOrder(menu)}
                  disabled={menu.isSoldOut}
                  className={`p-4 border rounded-lg ${
                    menu.isSoldOut ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <h3 className="font-bold">{menu.name}</h3>
                  <p>{menu.price.toLocaleString()}원</p>
                </button>
              ))}
            </div>
          </TabsContent>

          {categories.map(category => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-4 gap-4">
                {menus.filter(menu => menu.category === category).map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => addToOrder(menu)}
                    disabled={menu.isSoldOut}
                    className={`p-4 border rounded-lg ${
                      menu.isSoldOut ? 'bg-gray-200' : 'hover:bg-gray-100'
                    }`}
                  >
                    <h3 className="font-bold">{menu.name}</h3>
                    <p>{menu.price.toLocaleString()}원</p>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}

          <TabsContent value="all">
            <div className="grid grid-cols-4 gap-4">
              {menus.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => addToOrder(menu)}
                  disabled={menu.isSoldOut}
                  className={`p-4 border rounded-lg ${
                    menu.isSoldOut ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <h3 className="font-bold">{menu.name}</h3>
                  <p>{menu.price.toLocaleString()}원</p>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="w-1/3 p-4 border-l">
        <h2 className="text-xl font-bold mb-4">주문 내역</h2>
        <div className="space-y-4">
          {selectedItems.map(item => (
            <div key={item.menuItem.id} className="flex justify-between items-center">
              <div>
                <h3>{item.menuItem.name}</h3>
                <p>{item.menuItem.price.toLocaleString()}원</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                  className="px-2 py-1 border rounded"
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                  className="px-2 py-1 border rounded"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between text-xl font-bold">
            <span>총 금액</span>
            <span>{calculateTotal().toLocaleString()}원</span>
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="w-full mt-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            주문서 출력
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;