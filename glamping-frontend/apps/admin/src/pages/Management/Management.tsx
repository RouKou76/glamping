import { useState, useEffect } from 'react'
import Menu from '../Menu/Menu'
import Services from '../Services/Services'
import InfoEditor from '../InfoEditor/InfoEditor'
import Catalog from '../Catalog/Catalog'
import { useAuth } from '../../contexts/AuthContext'

type ManagementTab = 'menu' | 'services' | 'info' | 'catalog'

interface TabDef {
  id: ManagementTab
  label: string
  permission: string
}

const TABS: TabDef[] = [
  { id: 'menu', label: 'Меню', permission: 'manage_menu' },
  { id: 'services', label: 'Услуги', permission: 'manage_services' },
  { id: 'info', label: 'Инфо', permission: 'manage_settings' },
  { id: 'catalog', label: 'PDF каталоги', permission: 'manage_settings' },
]

export default function Management() {
  const { hasPermission } = useAuth()
  const visibleTabs = TABS.filter(t => hasPermission(t.permission))
  const [tab, setTab] = useState<ManagementTab | null>(null)

  useEffect(() => {
    if (visibleTabs.length > 0 && !tab) setTab(visibleTabs[0].id)
  }, [visibleTabs, tab])

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-4 pt-3 pb-2 shrink-0">
        {visibleTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${tab === t.id ? 'bg-glamp-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'menu' && <Menu />}
        {tab === 'services' && <Services />}
        {tab === 'info' && <InfoEditor />}
        {tab === 'catalog' && <Catalog />}
      </div>
    </div>
  )
}
