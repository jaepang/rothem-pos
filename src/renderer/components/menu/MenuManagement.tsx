import { useState, useEffect } from 'react';
import { MenuItem, MenuList } from '@/shared/types/menu';
import { loadMenuFromJson, saveMenuToJson, importMenuFromExcel, exportMenuToExcel } from '@/shared/utils/menu';

export function MenuManagement() {
  const [menus, setMenus] = useState<MenuList>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const loadedMenus = loadMenuFromJson();
    setMenus(loadedMenus);
  }, []);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedMenus = await importMenuFromExcel(file);
      setMenus(importedMenus);
      saveMenuToJson(importedMenus);
    } catch (error) {
      console.error('엑셀 파일 가져오기 실패:', error);
    }
  };

  const handleExport = () => {
    exportMenuToExcel(menus);
  };

  const handleToggleSoldOut = (menuId: string) => {
    const updatedMenus = menus.map((menu) =>
      menu.id === menuId ? { ...menu, isSoldOut: !menu.isSoldOut } : menu
    );
    setMenus(updatedMenus);
    saveMenuToJson(updatedMenus);
  };

  const handleToggleFavorite = (menuId: string) => {
    const updatedMenus = menus.map((menu) =>
      menu.id === menuId ? { ...menu, isFavorite: !menu.isFavorite } : menu
    );
    setMenus(updatedMenus);
    saveMenuToJson(updatedMenus);
  };

  const categories = ['all', ...new Set(menus.map((menu) => menu.category))];
  const filteredMenus = selectedCategory === 'all'
    ? menus
    : menus.filter((menu) => menu.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">메뉴 관리</h2>
        <div className="space-x-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileImport}
            className="hidden"
            id="excel-upload"
          />
          <label
            htmlFor="excel-upload"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
          >
            엑셀 가져오기
          </label>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            엑셀 내보내기
          </button>
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            }`}
          >
            {category === 'all' ? '전체' : category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMenus.map((menu) => (
          <div
            key={menu.id}
            className="p-4 border rounded-lg space-y-2 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{menu.name}</h3>
              <button
                onClick={() => handleToggleFavorite(menu.id)}
                className={`text-xl ${menu.isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ★
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{menu.category}</p>
            <p className="font-medium">{menu.price.toLocaleString()}원</p>
            <button
              onClick={() => handleToggleSoldOut(menu.id)}
              className={`w-full px-3 py-1 rounded ${
                menu.isSoldOut
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {menu.isSoldOut ? '품절' : '판매중'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 