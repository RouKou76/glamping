import { useState, useEffect } from 'react'
import { useApi, apiPost, apiDelete } from '@glamping/api'
import type { Service } from '@glamping/types'
import { ConfirmDialog } from '@glamping/ui'

export default function Services() {
  const { data: apiServices } = useApi<Service[]>('/api/services?showInactive=true')
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { if (apiServices) setServices(apiServices) }, [apiServices])
  const [editService, setEditService] = useState<Service | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formIcon, setFormIcon] = useState('')
  const [formRequiresTime, setFormRequiresTime] = useState(true)
  const [formDescription, setFormDescription] = useState('')
  const [formShowDescription, setFormShowDescription] = useState(false)
  const [formBooking, setFormBooking] = useState(false)
  const [formBookingSlots, setFormBookingSlots] = useState('')
  const [formBookingLimit, setFormBookingLimit] = useState(1)
  const [formBookingSchedule, setFormBookingSchedule] = useState<{ date: string; slots: string }[]>([])
  const [formErrors, setFormErrors] = useState<{ name?: string }>({})

  function formatDisplayDate(iso: string) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  function parseDisplayDate(v: string) {
    const cleaned = v.replace(/[^\d/]/g, '')
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
      const [d, m, y] = cleaned.split('/')
      return `${y}-${m}-${d}`
    }
    return cleaned
  }

  function openAdd() { setEditService(null); setFormName(''); setFormPrice(''); setFormIcon(''); setFormRequiresTime(true); setFormDescription(''); setFormShowDescription(false); setFormBooking(false); setFormBookingSlots(''); setFormBookingLimit(1); setFormBookingSchedule([]); setShowForm(true) }
  function openEdit(service: Service) { setEditService(service); setFormName(service.name); setFormPrice(service.priceInfo ?? ''); setFormIcon(service.icon ?? ''); setFormRequiresTime(service.requiresTime); setFormDescription(service.description ?? ''); setFormShowDescription(service.showDescription ?? false); setFormBooking(service.booking ?? false); setFormBookingSlots(service.bookingSlots?.join(', ') ?? ''); setFormBookingLimit(service.bookingLimit ?? 1); setFormBookingSchedule((service.bookingSchedule ?? []).map(s => ({ date: s.date, slots: s.slots.join(', ') }))); setShowForm(true) }

  function handleSave() {
    if (!formName.trim()) { setFormErrors({ name: 'Введите название' }); return }
    setFormErrors({})
    const payload = {
      name: formName.trim(), priceInfo: formPrice || undefined, icon: formIcon || undefined, assignedTo: 'admin' as const,
      fields: {
        requiresTime: formRequiresTime,
        description: formDescription.trim() || undefined,
        showDescription: formShowDescription,
        booking: formBooking,
        bookingSlots: formBooking ? formBookingSlots.split(',').map(s => s.trim()).filter(Boolean) : [],
        bookingLimit: formBooking ? formBookingLimit : 1,
        bookingSchedule: formBooking ? formBookingSchedule.map(s => ({ date: s.date, slots: s.slots.split(',').map(x => x.trim()).filter(Boolean) })) : [],
      }
    }
    if (editService) {
      const updated = { ...editService, ...payload, requiresTime: formRequiresTime, description: formDescription.trim() || undefined, showDescription: formShowDescription, booking: formBooking, bookingSlots: payload.fields.bookingSlots, bookingLimit: payload.fields.bookingLimit, bookingSchedule: payload.fields.bookingSchedule }
      setServices(prev => prev.map(s => s.id === editService.id ? updated : s))
      apiPost(`/api/services/${editService.id}`, payload).catch(() => {})
    } else {
      const newService: Service = { id: `cs-${Date.now()}`, ...payload, active: true, requiresTime: formRequiresTime, description: formDescription.trim() || undefined, showDescription: formShowDescription, booking: formBooking, bookingSlots: payload.fields.bookingSlots, bookingLimit: payload.fields.bookingLimit, bookingSchedule: payload.fields.bookingSchedule }
      setServices(prev => [...prev, newService])
      apiPost('/api/services', { ...payload, active: true }).catch(() => {})
    }
    setShowForm(false)
  }

  function toggleActive(id: string) {
    const service = services.find(s => s.id === id)
    if (!service) return
    const newValue = !service.active
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: newValue } : s))
    apiPost(`/api/services/${id}`, { active: newValue }).catch(() => {})
  }
  const [deleteId, setDeleteId] = useState<string | null>(null)
  function handleDeleteConfirm() { if (deleteId) { setServices(prev => prev.filter(s => s.id !== deleteId)); apiDelete(`/api/services/${deleteId}`).catch(() => {}) }; setDeleteId(null) }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Услуги</h2>
        <button onClick={openAdd} className="px-4 py-2 bg-glamp-600 text-white text-xs font-bold rounded-xl hover:bg-glamp-700 transition-colors active:scale-95">+ Добавить</button>
      </div>
      <div className="space-y-3">
        {services.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-white/20"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-300 dark:text-white/10"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><p className="text-sm">Нет услуг</p></div>) : services.map(service => (
          <div key={service.id} className={`bg-white dark:bg-[#1a1d27] border rounded-2xl p-4 space-y-3 shadow-sm transition-opacity ${service.active ? 'border-gray-100 dark:border-white/10' : 'border-gray-100 dark:border-white/5 opacity-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{service.icon || '⭐'}</span>
                <div><p className="text-sm font-bold text-gray-800 dark:text-white">{service.name}</p><p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">{service.priceInfo ?? 'Цена не указана'}</p></div>
              </div>
              <button onClick={() => toggleActive(service.id)} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${service.active ? 'bg-glamp-600' : 'bg-gray-300 dark:bg-white/10'}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${service.active ? 'left-6' : 'left-1'}`} /></button>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEdit(service)} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 text-xs font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Редактировать
              </button>
              <button onClick={() => setDeleteId(service.id)} className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/20 text-red-400 dark:text-red-400/60 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-gray-50 dark:bg-[#1a1d27] rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editService ? 'Редактировать услугу' : 'Новая услуга'}</h3>
            <div><label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Название *</label><input type="text" value={formName} onChange={e => { setFormName(e.target.value); setFormErrors({}) }} className={`w-full bg-white dark:bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 ${formErrors.name ? 'border-red-400' : 'border-gray-200 dark:border-white/10'}`} />{formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Иконка</label><input type="text" value={formIcon} onChange={e => setFormIcon(e.target.value)} placeholder="⭐" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
              <div><label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Цена (текстом)</label><input type="text" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="500 ₽ / час" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-white/70">Требует время</span>
              <button onClick={() => setFormRequiresTime(p => !p)} className={`w-12 h-6 rounded-full transition-colors relative ${formRequiresTime ? 'bg-glamp-600' : 'bg-gray-300 dark:bg-white/10'}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formRequiresTime ? 'left-7' : 'left-1'}`} /></button>
            </div>
            <div><label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Описание</label><textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Описание услуги для гостя..." rows={2} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500 resize-none" /></div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-white/70">Показывать описание</span>
              <button onClick={() => setFormShowDescription(p => !p)} className={`w-12 h-6 rounded-full transition-colors relative ${formShowDescription ? 'bg-glamp-600' : 'bg-gray-300 dark:bg-white/10'}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formShowDescription ? 'left-7' : 'left-1'}`} /></button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-white/70">Бронирование</span>
              <button onClick={() => setFormBooking(p => !p)} className={`w-12 h-6 rounded-full transition-colors relative ${formBooking ? 'bg-glamp-600' : 'bg-gray-300 dark:bg-white/10'}`}><span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formBooking ? 'left-7' : 'left-1'}`} /></button>
            </div>
            {formBooking && (
              <>
                <div><label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Слоты (через запятую)</label><input type="text" value={formBookingSlots} onChange={e => setFormBookingSlots(e.target.value)} placeholder="10:00, 14:00, 18:00" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
                <div><label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Лимит на слот</label><input type="number" min={1} value={formBookingLimit} onChange={e => setFormBookingLimit(Number(e.target.value) || 1)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" /></div>
                <div>
                  <label className="text-sm font-bold text-gray-600 dark:text-white/60 mb-1 block">Расписание по датам</label>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mb-2">Если не указано — используются слоты по умолчанию</p>
                  <div className="space-y-2">
                    {formBookingSchedule.map((entry, i) => (
                      <div key={i} className="flex gap-2 items-center min-w-0">
                        <input type="text" value={formatDisplayDate(entry.date)} onChange={e => { const next = [...formBookingSchedule]; next[i] = { ...next[i], date: parseDisplayDate(e.target.value) }; setFormBookingSchedule(next) }} placeholder="дд/мм/гггг" inputMode="numeric" className="w-24 shrink-0 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" />
                        <input type="text" value={entry.slots} onChange={e => { const next = [...formBookingSchedule]; next[i] = { ...next[i], slots: e.target.value }; setFormBookingSchedule(next) }} placeholder="10:00, 14:00" className="flex-1 min-w-0 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-glamp-500" />
                        <button onClick={() => setFormBookingSchedule(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0 p-1">✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setFormBookingSchedule(prev => [...prev, { date: '', slots: '' }])} className="mt-2 text-xs text-glamp-600 dark:text-glamp-400 font-medium hover:underline">+ Добавить дату</button>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={!formName.trim()} className="py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 disabled:opacity-30 text-white text-sm font-bold transition-colors active:scale-95">{editService ? 'Сохранить' : 'Создать'}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleteId} title="Удалить услугу?" message="Услуга будет удалена безвозвратно." confirmLabel="Удалить" onConfirm={handleDeleteConfirm} onClose={() => setDeleteId(null)} />
    </div>
  )
}
