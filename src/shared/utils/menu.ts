import { MenuItem, MenuList } from '../types/menu';
import * as XLSX from 'xlsx';

const MENU_FILE_PATH = 'menu.json';

export const loadMenuFromJson = (): MenuList => {
  try {
    const fs = window.require('fs');
    const data = fs.readFileSync(MENU_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('메뉴 파일을 불러오는데 실패했습니다:', error);
    return [];
  }
};

export const saveMenuToJson = (menu: MenuList): void => {
  try {
    const fs = window.require('fs');
    fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menu, null, 2));
  } catch (error) {
    console.error('메뉴 파일을 저장하는데 실패했습니다:', error);
  }
};

export const importMenuFromExcel = (file: File): Promise<MenuList> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const menuList: MenuList = jsonData.map((item: any) => ({
          id: crypto.randomUUID(),
          name: item.name || '',
          category: item.category || '기타',
          price: Number(item.price) || 0,
          isSoldOut: false,
          isFavorite: false,
        }));

        resolve(menuList);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const exportMenuToExcel = (menu: MenuList): void => {
  const worksheet = XLSX.utils.json_to_sheet(
    menu.map(({ id, isSoldOut, isFavorite, ...item }) => item)
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu');
  XLSX.writeFile(workbook, 'menu_export.xlsx');
}; 