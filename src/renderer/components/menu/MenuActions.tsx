import React, { RefObject } from 'react'

interface MenuActionsProps {
  onAddMenu: () => void
  onExportMenus: () => void
  excelInputRef: RefObject<HTMLInputElement | null>
  onImportMenus: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function MenuActions({ onAddMenu, onExportMenus, excelInputRef, onImportMenus }: MenuActionsProps) {
  return (
    <div className="space-x-2">
      <button
        onClick={onAddMenu}
        className="px-4 py-2 text-sm text-white bg-primary rounded hover:bg-primary/90"
      >
        메뉴 추가
      </button>
      <button
        onClick={onExportMenus}
        className="px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
      >
        엑셀 내보내기
      </button>
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx"
        onChange={onImportMenus}
        className="hidden"
      />
      <button
        onClick={() => excelInputRef.current?.click()}
        className="px-4 py-2 text-sm text-white bg-green-500 rounded hover:bg-green-600"
      >
        엑셀 가져오기
      </button>
    </div>
  )
} 