export const saveImage = async (file: File, menuId: string): Promise<string> => {
  try {
    // 파일을 ArrayBuffer로 읽기
    const buffer = await file.arrayBuffer()
    
    // IPC를 통해 메인 프로세스에서 파일 저장
    return await window.electronAPI.fs.saveImage(buffer, menuId)
  } catch (error) {
    console.error('이미지 저장 실패:', error)
    throw error
  }
}

export const deleteImage = async (imageUrl: string | null): Promise<void> => {
  if (!imageUrl) return
  
  try {
    // IPC를 통해 메인 프로세스에서 파일 삭제
    await window.electronAPI.fs.deleteImage(imageUrl)
  } catch (error) {
    console.error('이미지 삭제 실패:', error)
    throw error
  }
} 