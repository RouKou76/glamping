import { useState, useMemo, useEffect, useRef } from 'react'
import { useApi, apiPost, useNotifications } from '@glamping/api'
import type { Task, TaskStatus, House, Service } from '@glamping/types'
import { Badge } from '@glamping/ui'
import { useAuth } from '../../contexts/AuthContext'

type FilterStatus = TaskStatus | 'all' | 'archived'
type FilterType = string | 'all'

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  food: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>, label: 'Питание' },
  minibar: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" /></svg>, label: 'Минибар' },
  transfer: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>, label: 'Трансфер' },
  cleaning: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>, label: 'Уборка' },
  kupe: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>, label: 'Банный чан' },
  towels: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2" /><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" /><path d="M9.8 4.4A2 2 0 1 1 11 8H2" /></svg>, label: 'Полотенца' },
  gates: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>, label: 'Ворота' },
  custom: { icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, label: 'Услуга' },
}

const LOCATION_LABELS: Record<string, string> = {
  cabin: 'В домик', terrace: 'На террасу', gazebo: 'В беседку',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-orange-500', accepted: 'bg-blue-500', in_progress: 'bg-purple-500', done: 'bg-green-500', archived: 'bg-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая', accepted: 'Принята', in_progress: 'В работе', done: 'Готово', archived: 'В архиве',
}

function formatCreationTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function formatArchiveTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' +
    d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDesiredTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Сегодня, ${time}`
  return d.toLocaleDateString('ru', { day: '2-digit', month: 'long' }) + ', ' + time
}

function getDesiredTimeLabel(type: string): string {
  switch (type) {
    case 'food': return 'Подать '
    case 'transfer': return 'Выезд '
    case 'cleaning': return 'Уборка'
    case 'kupe': return 'Банный чан'
    default: return 'Заказано на'
  }
}

function getUrgency(desiredAt?: string): { color: string; label: string; sort: number } {
  if (!desiredAt) return { color: '', label: '', sort: 999 }
  const now = new Date()
  const target = new Date(desiredAt)
  const diffMin = (target.getTime() - now.getTime()) / 60000
  if (diffMin < 0) return { color: 'text-red-500 font-bold', label: 'Просрочено', sort: 0 }
  if (diffMin < 15) return { color: 'text-orange-500 font-bold', label: `${Math.round(diffMin)} мин`, sort: 1 }
  return { color: 'text-gray-800 dark:text-white', label: '', sort: 2 }
}

function getMainContent(ticket: Task): { title: string; items: string[] } {
  switch (ticket.type) {
    case 'food': return { title: 'Заказ', items: ticket.items?.map(i => `${i.name} ×${i.quantity}`) ?? [] }
    case 'transfer': {
      const items: string[] = []
      if (ticket.location) items.push(ticket.location)
      if (ticket.geo) items.push(ticket.geo)
      return { title: 'Направление', items: items.length > 0 ? items : ['Не указано'] }
    }
    case 'cleaning': return { title: '', items: ['Полная уборка домика'] }
    case 'kupe': return { title: '', items: ['Банный чан'] }
    case 'towels': return { title: '', items: ['Замена полотенец'] }
    case 'minibar': return { title: '', items: ['Пополнение минибар'] }
    case 'custom': return { title: 'Услуга', items: [ticket.description ?? ''] }
    default: return { title: '', items: [] }
  }
}

function getExtraInfo(ticket: Task): { icon: React.ReactNode; text: string }[] {
  const info: { icon: React.ReactNode; text: string }[] = []
  if (ticket.location && ticket.type !== 'transfer') info.push({ icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>, text: LOCATION_LABELS[ticket.location] ?? ticket.location })
  if (ticket.guestCount) info.push({ icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>, text: `${ticket.guestCount} чел.` })
  if (ticket.priceFix) info.push({ icon: null, text: `Стоимость: ${ticket.priceFix} руб.` })
  if (ticket.km) info.push({ icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l4.3 2.5"/></svg>, text: `Расстояние: ${ticket.km} км` })
  if (ticket.description && ticket.type !== 'custom') info.push({ icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>, text: ticket.description })
  return info
}

const NEXT_STATUS: Record<string, TaskStatus> = { new: 'in_progress', in_progress: 'done' }
const NEXT_LABEL: Record<string, string> = { new: 'В работу', in_progress: 'Готово' }

const CHECKOUT_DESCRIPTION = 'Заявка на выезд'

function isCheckoutTicket(ticket: Task): boolean {
  return ticket.description === CHECKOUT_DESCRIPTION
}

const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>

export default function Tickets() {
  const { data: apiTasks, refetch } = useApi<Task[]>('/api/tasks')
  const { data: apiHouses } = useApi<House[]>('/api/houses')
  const { data: apiServices } = useApi<Service[]>('/api/services?showInactive=true')
  const { data: apiMenu } = useApi<{ id: string; subcat?: string }[]>('/api/menu')
  const { user, hasPermission } = useAuth()
  const [tickets, setTickets] = useState<Task[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const housesRef = useRef(houses)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => { if (apiTasks) setTickets(apiTasks) }, [apiTasks])
  useEffect(() => { if (apiHouses) { setHouses(apiHouses); housesRef.current = apiHouses } }, [apiHouses])

  const availableTypes = useMemo(() => {
    const builtIn = ['food', 'minibar', 'transfer', 'cleaning', 'towels', 'kupe']
    const customServices = statusFilter === 'archived'
      ? (apiServices?.map(s => `custom:${s.name}`) ?? [])
      : (apiServices?.filter(s => s.active).map(s => `custom:${s.name}`) ?? [])
    return [...builtIn, ...customServices]
  }, [apiServices, statusFilter])

  function getCustomServiceName(description?: string): string | null {
    if (!description) return null
    const bracketMatch = description.match(/^\[(.+?)\]/)
    if (bracketMatch) return bracketMatch[1]
    if (description.trim()) return description.trim()
    return null
  }

  function getTicketFilterType(t: Task): string {
    if (t.type === 'custom') {
      const name = getCustomServiceName(t.description)
      return name ? `custom:${name}` : 'custom'
    }
    return t.type
  }

  function getTicketLabel(t: Task): string {
    if (t.type === 'custom') {
      const name = getCustomServiceName(t.description)
      return name ?? TYPE_CONFIG.custom.label
    }
    return TYPE_CONFIG[t.type]?.label ?? t.type
  }

  function canManageTicket(ticket: Task): boolean {
    const type = ticket.type
    return hasPermission('manage_tickets') ||
           hasPermission('view_tickets') ||
           hasPermission(`view_tickets:${type}`)
  }

  function canViewTicket(ticket: Task): boolean {
    return hasPermission('manage_tickets') ||
           hasPermission('view_tickets') ||
           hasPermission(`view_tickets:${ticket.type}`)
  }

  const { notify } = useNotifications()

  useEffect(() => {
    const handler = (e: Event) => {
      const event = (e as CustomEvent).detail
      if (event.type === 'server:ticket:created') {
        const task = event.payload as Task
        const perms = user?.role?.permissions ?? []
        const isAdmin = user?.role?.name === 'admin'
        const canView = isAdmin || perms.includes('manage_tickets') || perms.includes('view_tickets') || perms.includes(`view_tickets:${task.type}`)
        if (!canView) return
        setTickets(prev => [task, ...prev])
        const typeLabel = task.type === 'custom' && task.description ? task.description.split(']')[0].replace('[', '') : (TYPE_CONFIG[task.type]?.label ?? task.type)
        const houseNum = housesRef.current.find(h => h.id === task.houseId)?.number ?? '?'
        notify('Новая заявка', `${typeLabel} — Домик №${houseNum}`)
      }
      if (event.type === 'server:ticket:updated') {
        const updated = event.payload as Task
        if (updated.status === 'archived') {
          setTickets(prev => prev.filter(t => t.id !== updated.id))
        } else {
          setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
        }
      }
    }
    window.addEventListener('glamp:ticket:update', handler)
    return () => window.removeEventListener('glamp:ticket:update', handler)
  }, [user])

  function getHouseGuestCount(houseId: string): number {
    const house = houses.find(h => h.id === houseId) as { guestCount?: number } | undefined
    return house?.guestCount ?? 0
  }

  function getPricingInfo(ticket: Task) {
    if (!ticket.items || ticket.items.length === 0) return null
    const guestCount = getHouseGuestCount(ticket.houseId)
    if (!guestCount) return null
    const menuMap = new Map((apiMenu ?? []).map(m => [m.id, m.subcat ?? 'default']))
    const bySubcat = new Map<string, { qty: number; price: number }>()
    for (const item of ticket.items) {
      const subcat = menuMap.get(item.menuItemId) ?? 'default'
      const cur = bySubcat.get(subcat) ?? { qty: 0, price: 0 }
      cur.qty += item.quantity
      cur.price += item.price * item.quantity
      bySubcat.set(subcat, cur)
    }
    let totalExtra = 0
    let totalExtraPrice = 0
    const details: { label: string; extra: number; price: number }[] = []
    for (const [subcat, data] of bySubcat) {
      if (data.qty > guestCount) {
        const extra = data.qty - guestCount
        const extraPrice = Math.round(data.price / data.qty * extra)
        totalExtra += extra
        totalExtraPrice += extraPrice
        details.push({ label: subcat, extra, price: extraPrice })
      }
    }
    return { totalExtra, totalExtraPrice, details, exceeds: totalExtra > 0, exceededSubcats: new Set(details.map(d => d.label)) }
  }

  function getHouseNumber(houseId: string): number { return houses.find(h => h.id === houseId)?.number ?? 0 }

  function handleStatusChange(id: string, status: TaskStatus) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    apiPost(`/api/tasks/${id}`, { status }).catch(() => { })
  }

  function handleArchive(id: string) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t))
    setExpandedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    apiPost(`/api/tasks/${id}/cancel`, {}).catch(() => { })
  }

  const filtered = useMemo(() => {
    const result = tickets.filter(t => {
      if (!canViewTicket(t)) return false
      const ticketType = getTicketFilterType(t)
      const matchType = typeFilter === 'all' || ticketType === typeFilter
      if (statusFilter === 'archived') return t.status === 'archived' && matchType
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchStatus && matchType && t.status !== 'cancelled' && t.status !== 'archived'
    })
    return result.sort((a, b) => {
      const aCheckout = isCheckoutTicket(a) ? 0 : 1
      const bCheckout = isCheckoutTicket(b) ? 0 : 1
      if (aCheckout !== bCheckout) return aCheckout - bCheckout
      const urgA = getUrgency(a.desiredAt)
      const urgB = getUrgency(b.desiredAt)
      if (urgA.sort !== urgB.sort) return urgA.sort - urgB.sort
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [tickets, statusFilter, typeFilter])

  useEffect(() => {
    if (expandedIds.size === 0) {
      const foodIds = new Set(filtered.filter(t => t.type === 'food').map(t => t.id))
      if (foodIds.size > 0) setExpandedIds(foodIds)
    }
  }, [filtered])

  const newCount = tickets.filter(t => t.status === 'new').length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Заявки</h2>
        {newCount > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{newCount}</span>}
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {(['all', 'new', 'in_progress', 'done', 'archived'] as FilterStatus[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${statusFilter === s ? 'bg-glamp-600 border-glamp-600 text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            {s === 'all' ? 'Все' : s === 'new' ? 'Новые' : s === 'in_progress' ? 'В работе' : s === 'archived' ? 'Архив' : 'Готово'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {(['all', ...availableTypes] as FilterType[]).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${typeFilter === t ? 'bg-gray-800 dark:bg-white/15 border-gray-800 dark:border-white/30 text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            {t === 'all' ? 'Все типы' : t.startsWith('custom:') ? t.replace('custom:', '') : TYPE_CONFIG[t]?.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-gray-300 dark:text-white/10"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
          <p className="text-sm">Нет заявок</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const config = TYPE_CONFIG[ticket.type] ?? { icon: null, label: 'Заявка' }
            const ticketLabel = getTicketLabel(ticket)
            const houseNumber = getHouseNumber(ticket.houseId)
            const mainContent = getMainContent(ticket)
            const extraInfo = getExtraInfo(ticket)
            const urgency = getUrgency(ticket.desiredAt)
            const isExpanded = expandedIds.has(ticket.id)
            const nextStatus = NEXT_STATUS[ticket.status]
            const nextLabel = NEXT_LABEL[ticket.status]

            const isCheckout = isCheckoutTicket(ticket) && ticket.status !== 'archived'

            return (
              <div key={ticket.id}
                onClick={() => setExpandedIds(prev => { const n = new Set(prev); isExpanded ? n.delete(ticket.id) : n.add(ticket.id); return n })}
                className={`bg-white dark:bg-[#1a1d27] rounded-xl shadow-sm border overflow-hidden transition-all cursor-pointer active:scale-[0.98] ${isCheckout ? 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10' : 'border-gray-100 dark:border-white/10'}`}>

                {/* Шапка */}
                <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-600 dark:text-white/60 shrink-0">{config.icon}</span>
                    <span className="font-bold text-sm text-gray-800 dark:text-white truncate">{ticketLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white/50 text-[11px] font-bold px-2 py-0.5 rounded">Домик №{houseNumber}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[ticket.status] ?? 'bg-gray-400'}`}></span>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-white/50">{STATUS_LABELS[ticket.status] ?? ticket.status}</span>
                  </div>
                </div>

                {/* Заказано в */}
                <div className="px-4 pb-1">
                  <span className="text-[11px] text-gray-400 dark:text-white/30">Заказано в {formatCreationTime(ticket.createdAt)}</span>
                </div>

                {/* Основная информация — только для не-еды */}
                {ticket.type !== 'food' && mainContent.items.length > 0 && (
                  <div className="px-4 pb-1">
                    {mainContent.title && <p className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-0.5">{mainContent.title}</p>}
                    <div className="space-y-0">
                      {mainContent.items.map((item, i) => (
                        <p key={i} className={`leading-tight ${ticket.type === 'transfer' && i === 0 ? 'text-base font-bold text-gray-900 dark:text-white' : 'text-sm font-medium text-gray-800 dark:text-white'}`}>
                          {ticket.type === 'transfer' && i === 0 ? item : `• ${item}`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Время выполнения */}
                {ticket.desiredAt && ticket.status !== 'archived' && (
                  <div className="px-4 py-1.5 flex items-center gap-1.5">
                    <span className="text-gray-400 dark:text-white/30"><ClockIcon /></span>
                    <span className={`text-sm font-semibold ${urgency.color}`}>
                      {getDesiredTimeLabel(ticket.type)} {formatDesiredTime(ticket.desiredAt)}
                    </span>
                    {urgency.label && <span className={`text-xs ${urgency.color}`}>{urgency.label}</span>}
                  </div>
                )}
                {ticket.status === 'archived' && (
                  <div className="px-4 py-1.5 flex items-center gap-1.5">
                    <span className="text-gray-400 dark:text-white/30"><ClockIcon /></span>
                    <span className="text-sm text-gray-500 dark:text-white/50">
                      Архивировано {formatArchiveTime(ticket.updatedAt)}
                    </span>
                  </div>
                )}

                {/* Доп. информация */}
                {extraInfo.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1">
                    {extraInfo.map((info, i) => (
                      <span key={i} className={`flex items-center gap-1 ${ticket.type === 'transfer' ? 'text-sm font-medium text-gray-800 dark:text-white' : 'text-xs text-gray-600 dark:text-white/50'}`}>
                        {info.icon && <span className="text-gray-400 dark:text-white/30">{info.icon}</span>}
                        {info.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* Расширенный блок */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-white/10 space-y-3">
                    {ticket.items && ticket.items.length > 0 && (() => {
                      const pricing = getPricingInfo(ticket)
                      const menuMap = new Map((apiMenu ?? []).map(m => [m.id, m.subcat ?? 'default']))
                      return (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Состав</p>
                          {ticket.items!.map((item: { menuItemId: string; name: string; price: number; quantity: number }) => {
                            const subcat = menuMap.get(item.menuItemId) ?? 'default'
                            const isExtra = pricing?.exceededSubcats?.has(subcat) ?? false
                            return (
                              <div key={item.menuItemId} className="text-sm text-gray-800 dark:text-white">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="min-w-0 truncate">{item.name}</span>
                                  <span className="shrink-0 font-medium">×{item.quantity}</span>
                                </div>
                                {isExtra && <div className="text-right text-xs text-gray-500 dark:text-white/50">{item.price} ₽</div>}
                              </div>
                            )
                          })}
                          {pricing && pricing.exceeds ? (
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">К оплате: {pricing.totalExtra} доп. позиции</span>
                              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{pricing.totalExtraPrice} ₽</span>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-white/40">Без доплаты</div>
                          )}
                        </div>
                      )
                    })()}
                    <div className="grid grid-cols-2 gap-2">
                      {nextStatus && canManageTicket(ticket) && (
                        <button onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, nextStatus) }}
                          className={`py-2.5 rounded-xl text-xs font-bold text-white ${ticket.status === 'new' ? 'bg-amber-500' : ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'}`}>
                          {nextLabel}
                        </button>
                      )}
                      {ticket.status === 'done' && canManageTicket(ticket) && (
                        <button onClick={(e) => { e.stopPropagation(); handleArchive(ticket.id) }}
                          className="py-2.5 rounded-xl text-xs font-medium text-gray-600 dark:text-white/50 bg-gray-100 dark:bg-white/5">
                          В архив
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
