import { useState } from 'react'
import Roles from '../Roles/Roles'
import Users from '../Users/Users'
import { useAuth } from '../../contexts/AuthContext'

type StaffTab = 'roles' | 'users'

const TABS: { id: StaffTab; label: string; permission: string }[] = [
  { id: 'roles', label: 'Роли', permission: 'manage_roles' },
  { id: 'users', label: 'Люди', permission: 'manage_users' },
]

export default function Staff() {
  const { hasPermission } = useAuth()
  const visibleTabs = TABS.filter(t => hasPermission(t.permission))
  const [tab, setTab] = useState<StaffTab | null>(null)

  const effectiveTab = tab && visibleTabs.some(t => t.id === tab) ? tab : visibleTabs[0]?.id ?? null

  return (
    <div className="flex flex-col h-full">
      {visibleTabs.length > 1 && (
        <div className="flex gap-1 px-4 pt-3 pb-2 shrink-0">
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${effectiveTab === t.id ? 'bg-glamp-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {effectiveTab === 'roles' && <Roles />}
        {effectiveTab === 'users' && <Users />}
      </div>
    </div>
  )
}
