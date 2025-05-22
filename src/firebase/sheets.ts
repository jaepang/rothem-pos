import { GoogleToken } from './auth';

// 시트 데이터 타입
export interface SheetData {
  range: string;
  values: any[][];
}

// 시트 속성 타입
export interface SheetProperties {
  title: string;
  sheetId?: number;
  index?: number;
  [key: string]: any;
}

// 데이터 정제 함수
const sanitizeValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  // 배열이나 객체인 경우 JSON 문자열로 변환
  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }
  
  // boolean 값 변환
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  // 숫자 변환
  if (typeof value === 'number') {
    return String(value);
  }
  
  // 기타 문자열은 줄바꿈 제거
  return String(value).replace(/\n/g, ' ');
};

// 구글 시트 API 함수
export const SheetsService = {
  // 1. 스프레드시트 내 시트 목록 가져오기
  async getSheets(token: GoogleToken, spreadsheetId: string): Promise<SheetProperties[]> {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${token.accessToken}` }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('시트 목록 가져오기 에러 응답:', errorText);
      throw new Error(`API 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return data.sheets?.map((sheet: any) => sheet.properties) || [];
  },
  
  // 2. 새 시트 생성하기
  async createSheet(token: GoogleToken, spreadsheetId: string, sheetTitle: string) {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: sheetTitle }
            }
          }]
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('시트 생성 에러 응답:', errorText);
      throw new Error(`시트 생성 실패: ${response.status}`);
    }
    
    return (await response.json()).replies[0].addSheet.properties;
  },
  
  // 3. 시트에 데이터 쓰기
  async writeData(token: GoogleToken, spreadsheetId: string, range: string, values: any[][]) {
    try {
      // URL 인코딩
      const encodedRange = encodeURIComponent(range);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('데이터 쓰기 에러 응답:', errorText);
        throw new Error(`데이터 쓰기 실패: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('시트 데이터 쓰기 오류:', error);
      throw error;
    }
  },
  
  // 4. 시트 데이터 가져오기
  async readData(token: GoogleToken, spreadsheetId: string, range: string) {
    try {
      // URL 인코딩
      const encodedRange = encodeURIComponent(range);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
        {
          headers: { Authorization: `Bearer ${token.accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('데이터 읽기 에러 응답:', errorText);
        throw new Error(`데이터 읽기 실패: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('시트 데이터 읽기 오류:', error);
      throw error;
    }
  },
  
  // 5. 시트 데이터가 비어있는지 확인
  async isSheetEmpty(token: GoogleToken, spreadsheetId: string, sheetName: string) {
    try {
      // URL 인코딩
      const encodedSheetName = encodeURIComponent(sheetName);
      const result = await this.readData(token, spreadsheetId, `${encodedSheetName}!A1:B2`);
      return !result.values || result.values.length === 0;
    } catch (error) {
      // API 오류 발생 시 비어있는 것으로 처리 (새로 생성된 시트일 수 있음)
      return true;
    }
  },
  
  // 6. 구글 시트에서 데이터 로드 (객체 배열로 변환)
  async loadSheetData(token: GoogleToken, spreadsheetId: string, sheetName: string) {
    try {
      console.log(`시트 ${sheetName}에서 데이터 로드 시작`);
      // 전체 시트 데이터 가져오기
      const encodedSheetName = encodeURIComponent(sheetName);
      const result = await this.readData(token, spreadsheetId, `${encodedSheetName}!A1:Z1000`);
      
      if (!result.values || result.values.length < 2) {
        // 헤더 행만 있거나 데이터가 없음
        console.log(`시트 ${sheetName}에 데이터가 없거나 헤더만 있음`);
        return [];
      }
      
      // 헤더 행과 데이터 행 분리
      const [headers, ...rows] = result.values;
      console.log(`시트 ${sheetName} 헤더:`, headers);
      console.log(`시트 ${sheetName} 데이터 행 수:`, rows.length);
      
      // 한국어 컬럼명 -> 영어 키로 매핑 생성
      const reverseMapping: Record<string, string> = {};
      const sheetType = sheetName as keyof typeof columnMappings;
      
      if (columnMappings[sheetType]) {
        Object.entries(columnMappings[sheetType]).forEach(([key, koreanName]) => {
          reverseMapping[koreanName] = key;
        });
      }
      
      // 각 행을 객체로 변환
      const results = rows.map((row: any[], rowIndex: number) => {
        const obj: Record<string, any> = {};
        
        headers.forEach((header: string, index: number) => {
          // 헤더가 한국어면 영어 키로 변환, 아니면 그대로 사용
          const key = reverseMapping[header] || header;
          const value = index < row.length ? row[index] : null;
          
          // 값이 없는 경우
          if (value === undefined || value === null || value === '') {
            obj[key] = null;
            return;
          }
          
          // 불린 값 처리
          if (value === 'true' || value === 'TRUE') {
            obj[key] = true;
            return;
          } 
          
          if (value === 'false' || value === 'FALSE') {
            obj[key] = false;
            return;
          }
          
          // 숫자 처리
          if (!isNaN(Number(value)) && value.trim() !== '' && !value.startsWith('0')) {
            obj[key] = Number(value);
            return;
          }
          
          // JSON 문자열 파싱 시도 (배열, 객체)
          if (typeof value === 'string' && 
              ((value.startsWith('[') && value.endsWith(']')) || 
               (value.startsWith('{') && value.endsWith('}')))) {
            try {
              obj[key] = JSON.parse(value);
              return;
            } catch (e) {
              // 파싱 실패 시 원래 값 사용
              console.warn(`JSON 파싱 실패 (행 ${rowIndex + 2}, 열 "${key}"): ${e}`);
            }
          }
          
          // 그 외 문자열
          obj[key] = value;
        });
        
        return obj;
      });
      
      console.log(`시트 ${sheetName}에서 ${results.length}개 객체 로드 완료`);
      return results;
    } catch (error) {
      console.error(`${sheetName} 시트 데이터 로드 실패:`, error);
      throw error;
    }
  },
  
  // 7. 구글 시트에 데이터 업데이트 (개선된 버전)
  async updateSheetData(token: GoogleToken, spreadsheetId: string, sheetName: string, data: any[]) {
    try {
      // 시트가 존재하는지 확인
      const sheets = await this.getSheets(token, spreadsheetId);
      const sheetExists = sheets.some(sheet => sheet.title === sheetName);
      
      // 시트가 없으면 생성
      if (!sheetExists) {
        console.log(`시트 "${sheetName}"가 존재하지 않아 새로 생성합니다.`);
        await this.createSheet(token, spreadsheetId, sheetName);
      }
      
      // 기존 데이터가 있는지 확인
      const isEmpty = await this.isSheetEmpty(token, spreadsheetId, sheetName);
      
      if (isEmpty) {
        // 1. 비어있으면 새 데이터 쓰기 (헤더 포함)
        console.log(`시트 ${sheetName}가 비어 있어 새로 데이터 작성`);
        const sheetData = convertJsonToSheetData(data, sheetName);
        const encodedSheetName = encodeURIComponent(sheetName);
        const writeResult = await this.writeData(token, spreadsheetId, `${encodedSheetName}!A1`, sheetData);
        console.log('데이터 쓰기 결과:', writeResult);
        return true;
      } else {
        // 2. 기존 데이터가 있으면 기존 헤더 유지하면서 데이터 업데이트
        console.log(`시트 ${sheetName}에 기존 데이터 있음. 업데이트 시작`);
        
        // 2-1. 기존 헤더 가져오기
        const encodedSheetName = encodeURIComponent(sheetName);
        const headerResult = await this.readData(token, spreadsheetId, `${encodedSheetName}!A1:Z1`);
        const headers = headerResult.values?.[0] || [];
        
        if (headers.length === 0) {
          throw new Error('시트 헤더를 읽을 수 없습니다');
        }
        
        console.log('기존 헤더:', headers);
        
        // 2-2. 매핑 생성 (영어 키 <-> 한국어 컬럼명)
        const mapping = columnMappings[sheetName as keyof typeof columnMappings] || {};
        const reverseMapping: Record<string, string> = {};
        
        Object.entries(mapping).forEach(([key, koreanName]) => {
          reverseMapping[koreanName] = key;
        });
        
        // 2-3. 모든 데이터 행을 삭제 (헤더는 유지)
        const clearRange = `${encodeURIComponent(sheetName)}!A2:Z1000`;
        const clearResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!clearResponse.ok) {
          const errorText = await clearResponse.text();
          throw new Error(`데이터 삭제 실패: ${errorText}`);
        }
        
        console.log('기존 데이터 행 삭제 완료');
        
        // 기존 헤더 정보를 이용해 데이터 행 구성
        const dataRows = data.map(item => {
          return headers.map((header: string) => {
            // 헤더가 한국어면 영어 키로 변환하여 값을 찾고, 그렇지 않으면 그대로 사용
            const key = reverseMapping[header] || header;
            const value = item[key];
            return sanitizeValue(value);
          });
        });
        
        console.log(`${dataRows.length}개의 데이터 행 준비 완료`);
        
        // 2-4. 데이터 추가 (append API 사용)
        if (dataRows.length > 0) {
          try {
            // 시트 이름에 공백이나 특수문자가 있을 경우 URL 인코딩
            const encodedSheetName = encodeURIComponent(sheetName);
            const appendResponse = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A2:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token.accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  values: dataRows,
                  majorDimension: "ROWS"
                })
              }
            );
            
            if (!appendResponse.ok) {
              const errorData = await appendResponse.text();
              console.error(`데이터 추가 오류 응답:`, errorData);
              throw new Error(`데이터 추가 실패: ${appendResponse.status} - ${errorData}`);
            }
            
            const appendResult = await appendResponse.json();
            console.log('데이터 추가 결과:', appendResult);
          } catch (appendError) {
            console.error('시트 데이터 추가 중 오류:', appendError);
            throw appendError;
          }
        } else {
          console.log('추가할 데이터 없음');
        }
        
        console.log(`시트 ${sheetName} 업데이트 완료`);
      return true;
      }
    } catch (error) {
      console.error(`${sheetName} 시트 데이터 업데이트 실패:`, error);
      throw error;
    }
  }
};

// 각 데이터 타입별 영어 키 -> 한국어 컬럼명 매핑
interface ColumnMapping {
  [key: string]: string;
}

interface SheetMappings {
  menu: ColumnMapping;
  inventory: ColumnMapping;
  orders: ColumnMapping;
  coupons: ColumnMapping;
  [key: string]: ColumnMapping;
}

const columnMappings: SheetMappings = {
  // 메뉴 데이터 컬럼 매핑
  menu: {
    id: '메뉴ID',
    name: '메뉴명',
    displayName: '표시명',
    price: '가격',
    category: '카테고리',
    imageUrl: '이미지URL',
    description: '설명',
    isAvailable: '판매가능여부',
    isSoldOut: '품절여부',
    isHot: '핫옵션',
    isIce: '아이스옵션',
    hotPrice: '핫가격',
    icePrice: '아이스가격',
    options: '옵션',
    order: '정렬순서',
    relatedInventoryIds: '관련재고ID목록',
    priceInfo: '가격정보'
  },
  
  // 재고 데이터 컬럼 매핑
  inventory: {
    id: '재고ID',
    name: '상품명',
    quantity: '수량',
    unit: '단위',
    lastUpdated: '최종수정일',
    threshold: '최소수량',
    category: '분류',
    relatedMenuIds: '관련메뉴ID목록'
  },
  
  // 주문 데이터 컬럼 매핑
  orders: {
    id: '주문번호',
    orderDate: '주문일시',
    customerName: '고객명',
    totalAmount: '총액',
    paymentMethod: '결제방법',
    status: '주문상태',
    items: '주문항목',
    memo: '메모',
    tableNumber: '테이블번호',
    completedAt: '완료시간',
    printed: '출력여부'
  },
  
  // 쿠폰(선불권) 데이터 컬럼 매핑
  coupons: {
    id: '선불권ID',
    code: '선불권이름',
    amount: '초기금액',
    balance: '잔액',
    isUsed: '사용완료여부',
    createdAt: '생성일시',
    usedAt: '사용일시',
    userId: '사용자ID',
    createdBy: '생성자정보',
    usedBy: '사용자정보'
  }
};

// JSON 데이터를 시트 형식으로 변환 (특수 문자 처리 및 한국어 컬럼명 적용)
export const convertJsonToSheetData = (jsonData: any[], sheetName: string = 'menu'): any[][] => {
  if (!jsonData || !jsonData.length) {
    console.log(`${sheetName} 데이터가 없어 빈 헤더만 생성합니다.`);
    const mapping = columnMappings[sheetName as keyof typeof columnMappings] || {};
    
    // 데이터가 없을 경우 기본 매핑의 한국어 컬럼명으로 헤더만 구성
    if (Object.keys(mapping).length > 0) {
      return [Object.values(mapping)];
    }
    return [[]];
  }
  
  console.log(`[SheetService] ${sheetName} 데이터 변환 시작 (${jsonData.length}개 항목)`);
  
  // 필드 검증 및 보완 (coupons 데이터인 경우)
  if (sheetName === 'coupons') {
    jsonData = jsonData.map((item, index) => {
      // balance 필드 확인 및 보완
      if (item.balance === undefined || item.balance === null) {
        console.warn(`[SheetService] 쿠폰 #${index+1}(${item.code})의 balance 필드 누락, amount 값으로 설정`);
        return {
          ...item,
          balance: item.amount
        };
      }
      return item;
    });
  }
  
  // 헤더 행 (모든 키 추출)
  const keys = Object.keys(jsonData[0]);
  console.log(`[SheetService] ${sheetName} 데이터의 키 목록:`, keys);
  
  // 해당 시트에 대한 매핑 가져오기 (없으면 기본 매핑 사용)
  const mapping = columnMappings[sheetName as keyof typeof columnMappings] || {};
  
  // 키를 한국어 컬럼명으로 변환 (매핑이 없는 경우 원래 키 사용)
  const headers = keys.map(key => {
    const koreanName = mapping[key];
    if (!koreanName && sheetName === 'coupons') {
      console.warn(`[SheetService] 주의: '${key}' 필드에 대한 한국어 매핑이 없습니다.`);
    }
    return koreanName || key;
  });
  
  console.log(`[SheetService] ${sheetName} 최종 헤더:`, headers);
  
  // 데이터 행 추가 (정제 과정 포함)
  const rows = jsonData.map((item, rowIndex) => {
    return keys.map(key => {
      const value = item[key];
      
      // coupons 데이터의 경우 중요 필드 로깅
      if (sheetName === 'coupons' && (key === 'balance' || key === 'amount')) {
        console.log(`[SheetService] 쿠폰 #${rowIndex+1}, ${key}: ${value}`);
      }
      
      return sanitizeValue(value);
    });
  });
  
  // 헤더와 데이터 결합
  return [headers, ...rows];
}; 