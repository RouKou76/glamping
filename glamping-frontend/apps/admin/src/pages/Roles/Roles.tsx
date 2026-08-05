import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useApi, apiPost, apiDelete } from '@glamping/api'
import { ConfirmDialog } from '@glamping/ui'

interface Role {
  id: string
  name: string
  permissions: string[]
  userCount: number
  createdAt: string
}

const ALL_PERMISSIONS = [
  { key: 'manage_users', label: 'Управление пользователями' },
  { key: 'manage_houses', label: 'Управление домиками' },
  { key: 'manage_services', label: 'Управление услугами' },
  { key: 'manage_menu', label: 'Управление меню' },
  { key: 'view_tickets', label: 'Просмотр и управление заявками', hasSubtypes: true },
  { key: 'manage_chat', label: 'Управление чатом' },
  { key: 'manage_info', label: 'Управление информацией' },
  { key: 'manage_catalog', label: 'Управление каталогами' },
  { key: 'manage_roles', label: 'Управление ролями' },
]

const TICKET_TYPES = [
  { key: 'all', label: 'Все' },
  { key: 'food', label: 'Еда' },
  { key: 'transfer', label: 'Трансфер' },
  { key: 'cleaning', label: 'Уборка' },
  { key: 'towels', label: 'Полотенца' },
  { key: 'gates', label: 'Ворота' },
  { key: 'minibar', label: 'Мини-бар' },
  { key: 'kupe', label: 'Банный чан' },
  { key: 'custom', label: 'Кастомные' },
]

export default function Roles() {
  const { data: apiRoles, refetch } = useApi<Role[]>('/api/roles')
  const [roles, setRoles] = useState<Role[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [formName, setFormName] = useState('')
  const [formPermissions, setFormPermissions] = useState<string[]>([])
  const [formTicketTypes, setFormTicketTypes] = useState<string[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteUserCount, setDeleteUserCount] = useState(0)
  const [deleteError, setDeleteError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (apiRoles) setRoles(apiRoles) }, [apiRoles])

  function openCreate() { setEditRole(null); setFormName(''); setFormPermissions([]); setFormTicketTypes([]); setError(''); setShowForm(true) }
  function openEdit(role: Role) {
    setEditRole(role)
    setFormName(role.name)
    if (role.name === 'admin') {
      setFormPermissions(ALL_PERMISSIONS.filter(p => !p.hasSubtypes).map(p => p.key))
      setFormTicketTypes(['all'])
    } else {
      const perms = role.permissions ?? []
      setFormPermissions(perms.filter(p => !p.startsWith('view_tickets') && p !== 'manage_tickets'))
      const hasAllView = perms.includes('view_tickets')
      const ticketPerms = perms.filter(p => p.startsWith('view_tickets:')).map(p => p.split(':')[1])
      setFormTicketTypes(hasAllView && ticketPerms.length === 0 ? ['all'] : ticketPerms)
    }
    setError('')
    setShowForm(true)
  }

  function togglePermission(perm: string) {
    setFormPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  function toggleTicketType(type: string) {
    setFormTicketTypes(prev => {
      if (type === 'all') {
        return prev.includes('all') ? [] : ['all']
      }
      const withoutAll = prev.filter(t => t !== 'all')
      return withoutAll.includes(type) ? withoutAll.filter(t => t !== type) : [...withoutAll, type]
    })
  }

  async function handleSave() {
    if (editRole?.name === 'admin') { setError('Нельзя изменить права администратора'); return }
    if (!formName.trim()) { setError('Введите название роли'); return }

    const ticketPerms = formTicketTypes.includes('all')
      ? ['view_tickets']
      : formTicketTypes.map(t => `view_tickets:${t}`)

    const allPerms = [...formPermissions, ...ticketPerms]

    try {
      if (editRole) {
        await apiPost(`/api/roles/${editRole.id}`, { name: formName.trim(), permissions: allPerms })
      } else {
        await apiPost('/api/roles', { name: formName.trim(), permissions: allPerms })
      }
      setShowForm(false)
      refetch()
    } catch (e: any) { setError(e?.response?.data?.message || 'Ошибка сохранения') }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await apiDelete(`/api/roles/${deleteId}`)
      setRoles(prev => prev.filter(r => r.id !== deleteId))
      setDeleteId(null)
    } catch { setDeleteError('Нельзя удалить роль с привязанными пользователями. Сначала назначьте им другую роль.') }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Роли</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-glamp-600 text-white text-xs font-bold rounded-xl hover:bg-glamp-700 transition-colors active:scale-95">+ Добавить</button>
      </div>
      <div className="space-y-3">
        {roles.map(role => (
          <div key={role.id} className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-base font-bold text-gray-800 dark:text-white">{role.name}</p>
                <p className="text-xs text-gray-500 dark:text-white/50">{role.userCount} пользователей</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(role)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Изменить</button>
                {role.name !== 'admin' && <button onClick={() => { setDeleteId(role.id); setDeleteUserCount(role.userCount); setDeleteError('') }} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Удалить</button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(role.permissions ?? []).map(p => {
                if (p === 'view_tickets') return <span key={`${role.id}-view-all`} className="text-[10px] px-2 py-0.5 rounded-full bg-glamp-50 dark:bg-glamp-500/10 text-glamp-700 dark:text-white/80 border border-glamp-200 dark:border-glamp-500/20">Просмотр: Все</span>
                const baseLabel = ALL_PERMISSIONS.find(ap => ap.key === p)?.label
                const ticketLabel = p.startsWith('view_tickets:') ? TICKET_TYPES.find(t => t.key === p.split(':')[1])?.label : null
                const legacyLabel = p === 'manage_settings' ? 'Управление настройками' : p === 'manage_tickets' ? 'Управление заявками' : null
                const label = baseLabel ?? legacyLabel ?? (ticketLabel ? `Просмотр: ${ticketLabel}` : p)
                return <span key={`${role.id}-${p}`} className="text-[10px] px-2 py-0.5 rounded-full bg-glamp-50 dark:bg-glamp-500/10 text-glamp-700 dark:text-white/80 border border-glamp-200 dark:border-glamp-500/20">{label}</span>
              })}
              {role.name === 'admin'
                ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-glamp-50 dark:bg-glamp-500/10 text-glamp-700 dark:text-white/80 border border-glamp-200 dark:border-glamp-500/20">Полный доступ</span>
                : (!role.permissions || role.permissions.length === 0) && <span className="text-xs text-gray-400 dark:text-white/30">Нет прав</span>}
            </div>
          </div>
        ))}
        {roles.length === 0 && <p className="text-center text-gray-400 dark:text-white/30 text-sm py-8">Нет ролей</p>}
      </div>
      {showForm && createPortal(
        <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-gray-50 dark:bg-[#1a1d27] rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editRole ? 'Редактировать роль' : 'Новая роль'}</h3>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-1 block">Название</label>
              <input type="text" value={formName} onChange={e => { setFormName(e.target.value); setError('') }} disabled={editRole?.name === 'admin'}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-2 block">Права доступа</label>
              <div className="space-y-2">
                {ALL_PERMISSIONS.filter(p => !p.hasSubtypes).map(p => (
                  <label key={p.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
                    <input type="checkbox" checked={formPermissions.includes(p.key)} onChange={() => togglePermission(p.key)}
                      className="w-5 h-5 rounded border-gray-300 text-glamp-600 focus:ring-glamp-500" />
                    <span className="text-sm text-gray-700 dark:text-white/90">{p.label}</span>
                  </label>
                ))}
                <div className="px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-1.5">
                  <p className="text-sm font-bold text-gray-700 dark:text-white/90">Просмотр и управление заявками</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TICKET_TYPES.map(t => (
                      <label key={t.key} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/10 cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-white/15">
                        <input type="checkbox" checked={formTicketTypes.includes(t.key)}
                          onChange={() => toggleTicketType(t.key)}
                          className="w-5 h-5 rounded border-gray-300 text-glamp-600 focus:ring-glamp-500" />
                        <span className="text-xs text-gray-600 dark:text-white/70">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Отмена</button>
              <button onClick={handleSave} className="py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 text-white text-sm font-bold transition-colors active:scale-95">{editRole ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDialog
        open={!!deleteId}
        title={deleteUserCount > 0 ? 'Удалить роль?' : 'Удалить роль?'}
        message={deleteUserCount > 0
          ? `У роли ${deleteUserCount} ${deleteUserCount === 1 ? 'пользователь' : deleteUserCount < 5 ? 'пользователя' : 'пользователей'}. Сначала назначьте им другую роль, иначе они потеряют доступ.`
          : 'Роль будет удалена. Это действие нельзя отменить.'}
        confirmLabel="Удалить"
        onConfirm={handleDelete}
        onClose={() => { setDeleteId(null); setDeleteError('') }}
      />
      {deleteError && <p className="text-sm text-red-500 text-center">{deleteError}</p>}
    </div>
  )
}
