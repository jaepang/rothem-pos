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
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
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
      throw new Error(`데이터 쓰기 실패: ${response.status}`);
    }
    
    return await response.json();
  },
  
  // 4. 시트 데이터 가져오기
  async readData(token: GoogleToken, spreadsheetId: string, range: string) {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
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
  },
  
  // 5. 시트 데이터가 비어있는지 확인
  async isSheetEmpty(token: GoogleToken, spreadsheetId: string, sheetName: string) {
    try {
      const result = await this.readData(token, spreadsheetId, `${sheetName}!A1:B2`);
      return !result.values || result.values.length === 0;
    } catch (error) {
      // API 오류 발생 시 비어있는 것으로 처리 (새로 생성된 시트일 수 있음)
      return true;
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
  [key: string]: ColumnMapping;
}

const columnMappings: SheetMappings = {
  // 메뉴 데이터 컬럼 매핑
  menu: {
    id: '메뉴ID',
    name: '메뉴명',
    price: '가격',
    category: '카테고리',
    imageUrl: '이미지URL',
    description: '설명',
    isAvailable: '판매여부',
    options: '옵션'
  },
  
  // 재고 데이터 컬럼 매핑
  inventory: {
    id: '재고ID',
    name: '상품명',
    quantity: '수량',
    unit: '단위',
    lastUpdated: '최종수정일',
    threshold: '최소수량',
    category: '분류'
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
    tableNumber: '테이블번호'
  }
};

// JSON 데이터를 시트 형식으로 변환 (특수 문자 처리 및 한국어 컬럼명 적용)
export const convertJsonToSheetData = (jsonData: any[], sheetName: string = 'menu'): any[][] => {
  if (!jsonData || !jsonData.length) return [[]];
  
  // 헤더 행 (모든 키 추출)
  const keys = Object.keys(jsonData[0]);
  
  // 해당 시트에 대한 매핑 가져오기 (없으면 기본 매핑 사용)
  const mapping = columnMappings[sheetName as keyof typeof columnMappings] || {};
  
  // 키를 한국어 컬럼명으로 변환 (매핑이 없는 경우 원래 키 사용)
  const headers = keys.map(key => mapping[key] || key);
  
  // 데이터 정제 함수
  const sanitizeValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    return String(value).replace(/\n/g, ' ');
  };
  
  // 데이터 행 추가 (정제 과정 포함)
  const rows = jsonData.map(item => 
    keys.map(key => sanitizeValue(item[key]))
  );
  
  // 헤더와 데이터 결합
  return [headers, ...rows];
}; 