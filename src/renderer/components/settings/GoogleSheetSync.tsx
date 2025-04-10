import { useState, useEffect } from 'react';
import { GoogleToken, GoogleSheet } from '../../../firebase/auth';
import { SheetsService, convertJsonToSheetData } from '../../../firebase/sheets';

interface Props {
  token: GoogleToken;
  selectedSheet: GoogleSheet;
  onSync: (success: boolean) => void;
}

export const GoogleSheetSync = ({ token, selectedSheet, onSync }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const syncLocalDataToSheet = async () => {
    setIsLoading(true);
    setSyncState('syncing');
    setMessage('스프레드시트 연동 중...');
    
    try {
      // 1. 현재 시트 목록 가져오기
      const sheets = await SheetsService.getSheets(token, selectedSheet.id);
      const existingSheetTitles = sheets.map(s => s.title);
      
      // 2. 로컬 JSON 파일 가져오기
      const menuData = await window.electronAPI.menu.loadMenuFromJson();
      const inventoryData = await window.electronAPI.inventory.loadInventoryFromJson();
      const ordersData = await window.electronAPI.orders.loadOrdersFromJson();
      
      setMessage('데이터 로드 완료, 시트 확인 중...');
      
      // 3. 필요한 시트 확인 및 생성
      const requiredSheets = ['menu', 'inventory', 'orders'];
      
      for (const sheetName of requiredSheets) {
        if (!existingSheetTitles.includes(sheetName)) {
          // 시트가 없으면 생성
          await SheetsService.createSheet(token, selectedSheet.id, sheetName);
          setMessage(`${sheetName} 시트를 생성했습니다.`);
        }
      }
      
      // 4. 데이터 동기화
      setMessage('데이터 업로드 중...');
      
      // menu 시트 데이터 업로드
      if (menuData && menuData.length > 0) {
        // 시트가 비어있는지 확인
        const isEmpty = await SheetsService.isSheetEmpty(token, selectedSheet.id, 'menu');
        if (isEmpty) {
          const menuSheetData = convertJsonToSheetData(menuData);
          await SheetsService.writeData(token, selectedSheet.id, 'menu!A1', menuSheetData);
          setMessage('메뉴 데이터 업로드 완료');
        } else {
          setMessage('메뉴 시트가 이미 데이터가 있어 건너뜁니다.');
        }
      }
      
      // inventory 시트 데이터 업로드
      if (inventoryData && inventoryData.length > 0) {
        const isEmpty = await SheetsService.isSheetEmpty(token, selectedSheet.id, 'inventory');
        if (isEmpty) {
          const inventorySheetData = convertJsonToSheetData(inventoryData);
          await SheetsService.writeData(token, selectedSheet.id, 'inventory!A1', inventorySheetData);
          setMessage('재고 데이터 업로드 완료');
        } else {
          setMessage('재고 시트가 이미 데이터가 있어 건너뜁니다.');
        }
      }
      
      // orders 시트 데이터 업로드
      if (ordersData && ordersData.length > 0) {
        const isEmpty = await SheetsService.isSheetEmpty(token, selectedSheet.id, 'orders');
        if (isEmpty) {
          const ordersSheetData = convertJsonToSheetData(ordersData);
          await SheetsService.writeData(token, selectedSheet.id, 'orders!A1', ordersSheetData);
          setMessage('주문 데이터 업로드 완료');
        } else {
          setMessage('주문 시트가 이미 데이터가 있어 건너뜁니다.');
        }
      }
      
      // 5. 스프레드시트 ID 저장 (로컬 스토리지)
      localStorage.setItem('syncedSheetId', selectedSheet.id);
      localStorage.setItem('syncedSheetName', selectedSheet.name);
      
      setSyncState('success');
      setMessage('스프레드시트 연동이 완료되었습니다.');
      onSync(true);
    } catch (error: any) {
      console.error('시트 연동 실패:', error);
      setSyncState('error');
      setMessage(`오류 발생: ${error.message}`);
      onSync(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium">스프레드시트 연동</h3>
      <p className="text-sm text-gray-600 mb-2">
        선택한 스프레드시트: <strong>{selectedSheet.name}</strong>
      </p>
      
      <button
        onClick={syncLocalDataToSheet}
        disabled={isLoading}
        className={`px-4 py-2 rounded ${
          syncState === 'success' 
            ? 'bg-green-600 text-white' 
            : syncState === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
        }`}
      >
        {isLoading ? '연동 중...' : syncState === 'success' ? '연동 완료' : '스프레드시트 연동하기'}
      </button>
      
      {message && (
        <div className={`mt-2 p-2 rounded ${
          syncState === 'success' 
            ? 'bg-green-100 text-green-800' 
            : syncState === 'error' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}; 