import { MenuItem, MenuList } from '../types/menu';
import * as XLSX from 'xlsx';
import { deleteImage } from './image';
import fs from 'fs';
import path from 'path';

const MENU_FILE_PATH = path.join(process.cwd(), 'data', 'menu.json');

export const loadMenuFromJson = (): MenuList => {
  if (!fs.existsSync(MENU_FILE_PATH)) {
    return [];
  }
  const data = fs.readFileSync(MENU_FILE_PATH, 'utf-8');
  return JSON.parse(data);
};

export const saveMenuToJson = (menuList: MenuList): void => {
  const dirPath = path.dirname(MENU_FILE_PATH);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menuList, null, 2));
};

interface ExcelMenuItem {
  카테고리: string;
  메뉴명: string;
  가격: number;
}

export const exportMenuToExcel = (menuList: MenuList): void => {
  const excelData: ExcelMenuItem[] = menuList.map(menu => ({
    카테고리: menu.category,
    메뉴명: menu.name,
    가격: menu.price
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '메뉴목록');

  // 열 너비 설정
  const columnWidths = [
    { wch: 15 }, // 카테고리
    { wch: 30 }, // 메뉴명
    { wch: 10 }, // 가격
  ];
  worksheet['!cols'] = columnWidths;

  XLSX.writeFile(workbook, `메뉴목록_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const importMenuFromExcel = (file: File): Promise<MenuList> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelMenuItem[];

        const menuList: MenuList = jsonData.map(row => ({
          id: crypto.randomUUID(),
          category: row.카테고리,
          name: row.메뉴명,
          price: row.가격,
          imageUrl: null,
          isAvailable: true
        }));

        resolve(menuList);
      } catch (error) {
        reject(new Error('엑셀 파일 형식이 올바르지 않습니다.'));
      }
    };

    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.readAsArrayBuffer(file);
  });
};

export const deleteMenuItem = (menu: MenuItem, menus: MenuList): MenuList => {
  // 이미지 삭제
  deleteImage(menu.imageUrl);
  
  // 메뉴 목록에서 제거
  return menus.filter((m) => m.id !== menu.id);
}; 