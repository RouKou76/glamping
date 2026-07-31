import { useState, useEffect } from 'react'
import { useApi, apiPost } from '@glamping/api'

interface InfoContent { title: string; phone: string; wifiName: string; wifiPassword: string; rules: string; description: string; servicesText: string }
const INITIAL: InfoContent = { title: '', phone: '', wifiName: '', wifiPassword: '', rules: '', description: '', servicesText: '' }

export default function InfoEditor() {
  const { data } = useApi<InfoContent>('/api/settings')
  const [saved, setSaved] = useState<InfoContent>(INITIAL)
  const [draft, setDraft] = useState<InfoContent>(INITIAL)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (data) {
      setSaved(data)
      setDraft(data)
    }
  }, [data])

  const isDirty = draft.title !== saved.title || draft.phone !== saved.phone || draft.wifiName !== saved.wifiName || draft.wifiPassword !== saved.wifiPassword || draft.rules !== saved.rules || draft.description !== saved.description || draft.servicesText !== saved.servicesText

  function handleSave() {
    apiPost('/api/settings', draft).then(() => {
      setSaved(draft)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    }).catch(() => { })
  }

  function handleReset() { setDraft(saved) }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Редактор контента</h2>
          {isDirty && <span className="text-xs text-amber-500 font-medium">Есть изменения</span>}
        </div>
        <p className="text-xs text-gray-500 dark:text-white/50 mt-1">Отображается в разделе «Инфо» на планшете гостя</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Название глэмпинга</label><input type="text" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="Глэмпинг &quot;Пример названия&quot;" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Телефон</label><input type="text" value={draft.phone} onChange={e => setDraft(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (999) 123-45-67" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Название Wi-Fi</label><input type="text" value={draft.wifiName} onChange={e => setDraft(p => ({ ...p, wifiName: e.target.value }))} placeholder="SSID сети" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Пароль Wi-Fi</label><input type="text" value={draft.wifiPassword} onChange={e => setDraft(p => ({ ...p, wifiPassword: e.target.value }))} placeholder="Пароль" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Правила проживания</label><textarea value={draft.rules} onChange={e => setDraft(p => ({ ...p, rules: e.target.value }))} rows={5} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 resize-none" /></div>
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Описание территории ("О нас")</label><textarea value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} rows={4} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 resize-none" /></div>
        <div><label className="text-xs font-bold text-gray-600 dark:text-white/60 uppercase tracking-wider mb-2 block">Описание услуг ("Наши услуги")</label><textarea value={draft.servicesText} onChange={e => setDraft(p => ({ ...p, servicesText: e.target.value }))} rows={3} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 resize-none" /></div>
      </div>
      <div className="px-4 py-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d27] shrink-0 space-y-2 transition-colors">
        {success && <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium py-1">✓ Сохранено</div>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleReset} disabled={!isDirty} className="py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Сбросить</button>
          <button onClick={handleSave} disabled={!isDirty} className="py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 disabled:opacity-30 text-white text-sm font-bold transition-colors active:scale-95">Сохранить</button>
        </div>
      </div>
    </div>
  )
}
