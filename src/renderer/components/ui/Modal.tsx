import React, { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className={`bg-white rounded-lg p-6 w-full max-w-md ${className}`}>
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  )
} 