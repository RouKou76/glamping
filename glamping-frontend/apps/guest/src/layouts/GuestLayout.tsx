import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@glamping/ui'
import { useConnectionStatus } from '@glamping/api'
import { useGlampInfo } from '../contexts/GlampInfoContext'
import { useDevice } from '../contexts/DeviceContext'

export default function GuestLayout() {
  const { t } = useTranslation()
  const { info } = useGlampInfo()
  const { houseId, isInitialized } = useDevice()
  const { isConnected } = useConnectionStatus({ checkInterval: 30000, wsConnected: houseId ? undefined : true })
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOffline = () => setBrowserOnline(false)
    const handleOnline = () => setBrowserOnline(true)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => { window.removeEventListener('offline', handleOffline); window.removeEventListener('online', handleOnline) }
  }, [])

  if (isInitialized && !houseId) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-glamp-50 dark:bg-[#0f1117] p-6 text-center transition-colors">
        <div className="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-gray-400 dark:text-white/40">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{t('layout.noAccess')}</h1>
        <p className="text-sm text-gray-500 dark:text-white/50 max-w-xs">
          {t('layout.noAccessHint')}
        </p>
        {info.phone && (
          <a href={`tel:${info.phone}`}
            className="mt-4 text-sm text-glamp-600 dark:text-green-400 font-medium">
            {info.phone}
          </a>
        )}
      </div>
    )
  }

  const isOffline = !browserOnline || !isConnected

  return (
    <div className="flex flex-col h-screen bg-glamp-50 dark:bg-[#0f1117] text-gray-800 dark:text-gray-200 overflow-hidden transition-colors">
      {isOffline && (
        <div className="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/20 px-4 py-3 flex items-center gap-3 transition-colors">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-500 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('validation.offline')}</p>
            <p className="text-xs text-red-600 dark:text-red-300">{t('layout.contactAdmin')}</p>
            <a href={`tel:${info.phone}`} className="text-sm text-red-600 dark:text-red-300 font-medium underline">{info.phone}</a>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full h-20 bg-white dark:bg-[#1a1d27] border-t border-gray-200 dark:border-white/10 flex justify-around items-center px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none z-30 transition-colors">
        <NavLink to="/info" className={({ isActive }) => `flex flex-col items-center justify-center w-16 gap-1 transition-colors ${isActive ? 'text-glamp-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          <span className="text-[10px] font-semibold">{t('nav.info')}</span>
        </NavLink>

        <div className="-mt-6">
          <NavLink to="/" end className={({ isActive }) => `w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform ${isActive ? 'bg-glamp-600 scale-110' : 'bg-gray-800 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/20'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
          </NavLink>
          <span className="block text-center text-[10px] font-medium text-gray-800 dark:text-gray-400 mt-1">{t('nav.services')}</span>
        </div>

        <NavLink to="/chat" className={({ isActive }) => `flex flex-col items-center justify-center w-16 gap-1 transition-colors ${isActive ? 'text-glamp-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
          <span className="text-[10px] font-semibold">{t('nav.chat')}</span>
        </NavLink>
      </nav>
    </div>
  )
}
