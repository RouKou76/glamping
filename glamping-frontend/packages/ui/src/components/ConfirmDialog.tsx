import React from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  variant = 'danger',
  onConfirm,
  onClose,
}) => {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-slide-up border border-gray-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${variant === 'danger' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 'bg-glamp-100 dark:bg-glamp-500/20 text-glamp-600'}`}>
          {variant === 'danger' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          )}
        </div>
        <div>
          <p className="text-gray-800 dark:text-white font-bold text-lg">{title}</p>
          <p className="text-gray-600 dark:text-white/80 text-sm mt-1 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2">{message}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose}
            className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70 py-2.5 rounded-2xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:scale-95">
            Отмена
          </button>
          <button onClick={onConfirm}
            className={`${variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-glamp-600 hover:bg-glamp-700'} text-white py-2.5 rounded-2xl font-semibold text-sm transition-colors active:scale-95 shadow-sm`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
