import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(loginValue, password)
      navigate('/')
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 p-6 transition-colors">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-glamp-100 dark:bg-glamp-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-glamp-600 dark:text-green-400"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Glamping Admin</h1>
            <p className="text-sm text-gray-500 dark:text-white/50 mt-1">Вход в панель управления</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Логин</label>
              <input type="text" value={loginValue} onChange={e => setLoginValue(e.target.value)} required
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-1.5 block">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 transition-colors" />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 disabled:opacity-50 text-white text-sm font-bold transition-colors active:scale-95">
              {submitting ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
