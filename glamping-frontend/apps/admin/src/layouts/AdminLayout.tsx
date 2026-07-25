import { useState, useMemo } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { ConnectionBanner, ThemeToggle } from '@glamping/ui'
import type { ConnectionStatus } from '@glamping/ui'
import { useWebSocket } from '@glamping/api'
import { GateAlertBanner } from './GateAlertBanner'
import { useAuth } from '../contexts/AuthContext'

const connectionStatus: ConnectionStatus = 'connected'

interface GateRequest {
  houseId: string
  houseNumber: number
}

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end: boolean
  permission?: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Заявки', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>, end: true },
  { to: '/checkin', label: 'Домики', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, end: false, permission: 'manage_houses' },
  { to: '/manage', label: 'Управление', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/><circle cx="12" cy="12" r="3"/></svg>, end: false, permission: 'manage_menu' },
  { to: '/chats', label: 'Чат', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>, end: false, permission: 'manage_chat' },
  { to: '/staff', label: 'Персонал', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 16v-6"/><path d="M16 10h6"/></svg>, end: false, permission: 'manage_roles' },
]

export default function AdminLayout() {
  const [gateRequest, setGateRequest] = useState<GateRequest | null>(null)
  const { user, logout, hasAnyPermission } = useAuth()

  const wsAuth = useMemo(() => ({ role: 'admin', token: localStorage.getItem('glamp-token') || '' }), [])

  useWebSocket({
    auth: wsAuth,
    onMessage: (msg) => {
      if (msg.type === 'server:ticket:created' || msg.type === 'server:ticket:updated') {
        window.dispatchEvent(new CustomEvent('glamp:ticket:update', { detail: msg }))
      }
      if (msg.type === 'server:message:new') {
        window.dispatchEvent(new CustomEvent('glamp:message:new', { detail: msg.payload }))
      }
    },
  })

  const visibleNav = NAV_ITEMS.filter(item => !item.permission || hasAnyPermission(item.permission))

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0f1117] text-gray-800 dark:text-white overflow-hidden transition-colors">
      <ConnectionBanner status={connectionStatus} />

      {gateRequest && (
        <GateAlertBanner
          houseNumber={gateRequest.houseNumber}
          onConfirm={() => setGateRequest(null)}
          onDismiss={() => setGateRequest(null)}
        />
      )}

      <header className="px-4 py-3 bg-white dark:bg-[#1a1d27] border-b border-gray-200 dark:border-white/10 shrink-0 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-800 dark:text-white">Glamping · {user?.role?.name ?? 'Администратор'}</h1>
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Выйти</button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="flex border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d27] shrink-0 transition-colors">
        {visibleNav.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-bold transition-colors ${isActive ? 'text-black dark:text-white' : 'text-gray-500 dark:text-white/60'}`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
