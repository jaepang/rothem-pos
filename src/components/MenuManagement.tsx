import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import * as XLSX from 'xlsx';
import { MenuItem } from '../types/menu';

interface ExcelMenuItem {
  id?: string;
  category: string;
  name: string;
  price: string | number;
  isSoldOut: string | boolean;
  isFavorite?: string | boolean;
}

const MenuManagement: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    const result = await ipcRenderer.invoke('load-menu');
    if (result.success) {
      setMenus(result.data);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleExcelImport(file);
    }
  };

  const handleExcelImport = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelMenuItem[];

      // 데이터 검증 및 변환
      const validMenus = jsonData.map((item) => ({
        id: item.id || crypto.randomUUID(),
        category: item.category,
        name: item.name,
        price: Number(item.price),
        isSoldOut: Boolean(item.isSoldOut),
        isFavorite: Boolean(item.isFavorite)
      }));

      setMenus(validMenus);
      await ipcRenderer.invoke('save-menu', validMenus);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleToggleSoldOut = async (id: string) => {
    const updatedMenus = menus.map(menu => 
      menu.id === id ? { ...menu, isSoldOut: !menu.isSoldOut } : menu
    );
    setMenus(updatedMenus);
    await ipcRenderer.invoke('save-menu', updatedMenus);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="mb-4"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menus.map(menu => (
          <div key={menu.id} className="border p-4 rounded-lg">
            <h3 className="font-bold">{menu.name}</h3>
            <p className="text-gray-600">{menu.category}</p>
            <p className="text-lg">{menu.price.toLocaleString()}원</p>
            <button
              onClick={() => handleToggleSoldOut(menu.id)}
              className={`mt-2 px-4 py-2 rounded ${
                menu.isSoldOut 
                  ? 'bg-red-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}
            >
              {menu.isSoldOut ? '품절' : '판매 중'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuManagement;