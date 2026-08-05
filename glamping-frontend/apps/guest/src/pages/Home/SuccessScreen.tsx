import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SuccessScreenProps {
  title: string
  message: string
  onClose: () => void
  autoCloseMs?: number
}

export function SuccessScreen({ title, message, onClose, autoCloseMs = 5000 }: SuccessScreenProps) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(autoCloseMs)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 100) { clearInterval(interval); onClose(); return 0 }
        return prev - 100
      })
    }, 100)
    return () => clearInterval(interval)
  }, [onClose, autoCloseMs])

  const progress = remaining / autoCloseMs

  return (
    <div className="p-5 text-center space-y-3">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <div>
        <p className="text-gray-800 dark:text-gray-200 font-bold text-lg">{title}</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{message}</p>
      </div>
      <div className="relative">
        <button onClick={onClose}
          className="w-full py-2.5 rounded-2xl font-semibold transition-all active:scale-95 relative overflow-hidden border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-400 text-sm">
          <span className="relative z-10">{t('confirm.close')}</span>
        </button>
        <div className="absolute inset-0 rounded-2xl bg-glamp-600/20 dark:bg-green-500/20 transition-all duration-100 ease-linear pointer-events-none"
          style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
