import { useState } from 'react';
import { GoogleToken, GoogleSheet } from '../../../firebase/auth';
import { DataService } from '../../../firebase/dataService';

interface GoogleSheetSyncProps {
  token: GoogleToken;
  selectedSheet: GoogleSheet;
  onSync?: (success: boolean) => void;
}

export const GoogleSheetSync = ({ token, selectedSheet, onSync }: GoogleSheetSyncProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 이미 동기화된 시트인지 확인
  const isAlreadySynced = (): boolean => {
    const currentSheetId = localStorage.getItem('syncedSheetId');
    return currentSheetId === selectedSheet.id;
  };

  // 시트 동기화/연동 처리
  const handleSyncSheet = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      // 1. 선택한 시트 정보를 저장
      localStorage.setItem('syncedSheetId', selectedSheet.id);
      localStorage.setItem('syncedSheetName', selectedSheet.name);

      // 2. 실제 초기 데이터 동기화 실행
      const result = await DataService.syncAllData(token);
      
      // 3. 결과 표시
      const allSuccess = Object.values(result).every(val => val);
      setSyncResult({
        success: allSuccess,
        message: allSuccess 
          ? '동기화 완료! 이제 데이터가 구글 시트와 동기화됩니다.'
          : '일부 데이터 동기화 실패. 자세한 내용은 로그를 확인하세요.'
      });
      
      // 4. 동기화 완료 콜백 호출
      if (onSync) {
        onSync(allSuccess);
      }
    } catch (error) {
      console.error('시트 동기화 오류:', error);
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      });
      
      // 오류 발생 시에도 콜백 호출 (실패 상태로)
      if (onSync) {
        onSync(false);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="mt-4 p-3 border rounded-lg bg-gray-50">
      <h3 className="mb-2 font-medium">선택한 시트: {selectedSheet.name}</h3>
      
      {syncResult && (
        <div className={`p-2 mb-3 rounded ${
          syncResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {syncResult.message}
        </div>
      )}
      
      <div className="flex gap-2">
        {!isAlreadySynced() ? (
          <button
            onClick={handleSyncSheet}
            disabled={isSyncing}
            className="px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSyncing ? '연동 중...' : '이 시트와 연동하기'}
          </button>
        ) : (
          <>
            <span className="px-3 py-1 text-green-600 bg-green-100 rounded">
              ✓ 연동됨
            </span>
            <button
              onClick={handleSyncSheet}
              disabled={isSyncing}
              className="px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSyncing ? '동기화 중...' : '지금 동기화'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 