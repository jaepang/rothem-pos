import path from 'node:path';
import fs from 'node:fs';

const IMAGE_DIR = path.join(process.cwd(), 'public', 'images', 'menu');

export const saveImage = async (file: File, menuId: string): Promise<string> => {
  try {
    // 파일 확장자 추출
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${menuId}.${ext}`;
    const filePath = path.join(IMAGE_DIR, fileName);
    
    // 이미지 디렉토리가 없으면 생성
    if (!fs.existsSync(IMAGE_DIR)) {
      fs.mkdirSync(IMAGE_DIR, { recursive: true });
    }

    // 파일을 ArrayBuffer로 읽기
    const buffer = await file.arrayBuffer();
    
    // 파일 저장
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    // 상대 경로 반환 (public 기준)
    return `/images/menu/${fileName}`;
  } catch (error) {
    console.error('이미지 저장 실패:', error);
    throw error;
  }
};

export const deleteImage = (imageUrl: string | null): void => {
  if (!imageUrl) return;
  
  try {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return;
    
    const filePath = path.join(IMAGE_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('이미지 삭제 실패:', error);
  }
}; 