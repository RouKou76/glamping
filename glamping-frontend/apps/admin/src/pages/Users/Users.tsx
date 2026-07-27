import { useState, useEffect } from 'react'
import { useApi, apiPost, apiDelete } from '@glamping/api'
import { ConfirmDialog } from '@glamping/ui'

interface User {
  id: string
  login: string
  name: string
  roleId: string
  role: string
  createdAt: string
}

interface Role {
  id: string
  name: string
}

export default function Users() {
  const { data: apiUsers, refetch } = useApi<User[]>('/api/users')
  const { data: apiRoles } = useApi<Role[]>('/api/roles')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [formLogin, setFormLogin] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formName, setFormName] = useState('')
  const [formRoleId, setFormRoleId] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { if (apiUsers) setUsers(apiUsers) }, [apiUsers])
  useEffect(() => { if (apiRoles) setRoles(apiRoles) }, [apiRoles])

  function openCreate() { setEditUser(null); setFormLogin(''); setFormPassword(''); setFormName(''); setFormRoleId(roles[0]?.id ?? ''); setError(''); setShowForm(true) }
  function openEdit(user: User) { setEditUser(user); setFormLogin(user.login); setFormPassword(''); setFormName(user.name); setFormRoleId(user.roleId); setError(''); setShowForm(true) }

  async function handleSave() {
    if (!formLogin.trim() || !formName.trim() || !formRoleId) { setError('Заполните все поля'); return }
    if (!editUser && !formPassword) { setError('Введите пароль'); return }
    try {
      if (editUser) {
        const payload: Record<string, unknown> = { name: formName.trim(), roleId: formRoleId }
        if (formPassword) payload.password = formPassword
        await apiPost(`/api/users/${editUser.id}`, payload)
      } else {
        await apiPost('/api/users', { login: formLogin.trim(), password: formPassword, name: formName.trim(), roleId: formRoleId })
      }
      setShowForm(false)
      refetch()
    } catch { setError('Ошибка сохранения') }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await apiDelete(`/api/users/${deleteId}`)
      refetch()
    } catch { /* ignore */ }
    setDeleteId(null)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Пользователи</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-glamp-600 text-white text-xs font-bold rounded-xl hover:bg-glamp-700 transition-colors active:scale-95">+ Добавить</button>
      </div>
      <div className="space-y-3">
        {users.map(user => (
          <div key={user.id} className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-gray-800 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-white/50">{user.login}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-glamp-50 dark:bg-glamp-500/10 text-glamp-700 dark:text-white/80 border border-glamp-200 dark:border-glamp-500/20 mt-1 inline-block">{user.role}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(user)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Изменить</button>
                {user.login !== 'admin' && <button onClick={() => setDeleteId(user.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Удалить</button>}
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-center text-gray-400 dark:text-white/30 text-sm py-8">Нет пользователей</p>}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-gray-50 dark:bg-[#1a1d27] rounded-t-3xl p-6 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editUser ? 'Редактировать пользователя' : 'Новый пользователь'}</h3>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-1 block">Логин</label>
              <input type="text" value={formLogin} onChange={e => setFormLogin(e.target.value)} disabled={!!editUser}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-1 block">{editUser ? 'Новый пароль (оставьте пустым)' : 'Пароль'}</label>
              <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-1 block">Имя</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-1 block">Роль</label>
              <select value={formRoleId} onChange={e => setFormRoleId(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500">
                <option value="">Выберите роль</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Отмена</button>
              <button onClick={handleSave} className="py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 text-white text-sm font-bold transition-colors active:scale-95">{editUser ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleteId} title="Удалить пользователя?" message="Пользователь будет удалён безвозвратно." confirmLabel="Удалить" onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
    </div>
  )
}
