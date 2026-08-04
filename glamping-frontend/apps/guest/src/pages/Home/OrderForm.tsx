import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@glamping/ui'
import { useApi, apiPost } from '@glamping/api'
import type { MenuItem, TaskItem } from '@glamping/types'
import { CityAutocomplete } from '../../components/CityAutocomplete'
import { SLOTS, periodFromTime } from '../../hooks/useMealPeriod'
import { SuccessScreen } from './SuccessScreen'

export interface OrderStepDate { type: 'date'; key: string; label: string; required?: boolean }
export interface OrderStepTime { type: 'time'; key: string; label: string; minAdvanceMinutes?: number; required?: boolean }
export interface OrderStepSelect { type: 'select'; key: string; label: string; options: { value: string; label: string }[]; required?: boolean }
export interface OrderStepNumber { type: 'number'; key: string; label: string; min?: number; max?: number; required?: boolean }
export interface OrderStepText { type: 'text'; key: string; label: string; placeholder?: string; required?: boolean }
export interface OrderStepTextarea { type: 'textarea'; key: string; label: string; placeholder?: string; required?: boolean }
export interface OrderStepMenu { type: 'menu'; key: string; items: MenuItem[]; required?: boolean }
export interface OrderStepCatalog { type: 'catalog'; key: string; label: string; items: { id: string; name: string; price: number; isAvailable?: boolean }[]; required?: boolean }
export interface OrderStepCity { type: 'city'; key: string; label: string; required?: boolean }
export interface OrderStepSlot { type: 'slot'; key: string; label: string; serviceId: string; slots: { time: string; booked: number; limit: number }[]; required?: boolean }

export type OrderStep = OrderStepDate | OrderStepTime | OrderStepSelect | OrderStepNumber | OrderStepText | OrderStepTextarea | OrderStepMenu | OrderStepCatalog | OrderStepCity | OrderStepSlot

interface OrderFormProps {
  open: boolean
  title: string
  steps: OrderStep[]
  houseId: string | null
  guestCount: number | null
  transfers?: { id: string; name: string; km: number; price: number }[]
  taskType: string
  serviceName?: string
  hint?: string
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FOOD_MIN_ADVANCE_HOURS = 1
const GENERAL_MIN_ADVANCE_MINUTES = 15

function getMinTime(dateStr: string): string {
  if (dateStr === todayStr()) {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
  return '00:00'
}

export function OrderForm({ open, title, steps, houseId, guestCount, transfers, taskType, serviceName, hint, onClose, onSubmit }: OrderFormProps) {
  const { t, i18n } = useTranslation()

  function validate(steps: OrderStep[], values: Record<string, unknown>, cart: Record<string, number>): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const s of steps) {
      if (!s.required) continue
      if (s.type === 'date') { continue }
      else if (s.type === 'time') { if (!values[s.key]) errors[s.key] = t('validation.selectTime') }
      else if (s.type === 'select') { if (!values[s.key]) errors[s.key] = t('validation.selectOption', { field: s.label.toLowerCase() }) }
      else if (s.type === 'number') { continue }
      else if (s.type === 'text') { if (!(values[s.key] as string)?.trim()) errors[s.key] = t('validation.required') }
      else if (s.type === 'textarea') { if (!(values[s.key] as string)?.trim()) errors[s.key] = t('validation.required') }
      else if (s.type === 'menu') { if (!Object.values(cart).some(q => q > 0)) errors[s.key] = t('validation.selectDish') }
      else if (s.type === 'catalog') {
        const hasChecked = s.items.some(i => values[`${s.key}_selected_${i.id}`])
        if (!hasChecked) errors[s.key] = t('validation.selectDish')
      }
      else if (s.type === 'city') { if (!values[s.key]) errors[s.key] = t('validation.required') }
      else if (s.type === 'slot') { if (!values[s.key]) errors[s.key] = t('validation.selectTime') }
    }
    return errors
  }

  function ErrorMsg({ text }: { text?: string }) {
    if (!text) return null
    return <p className="text-red-500 text-sm mt-1">{text}</p>
  }

  const [step, setStep] = useState<'edit' | 'success'>('edit')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [cart, setCart] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [collapsedSubcats, setCollapsedSubcats] = useState<Set<string>>(new Set())
  function toggleSubcat(subcat: string) { setCollapsedSubcats(prev => { const next = new Set(prev); next.has(subcat) ? next.delete(subcat) : next.add(subcat); return next }) }
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [slotAvailability, setSlotAvailability] = useState<Record<string, { time: string; booked: number; limit: number }[]>>({})
  const slotStep = steps.find(s => s.type === 'slot') as OrderStepSlot | undefined
  const hasDateStep = steps.some(s => s.type === 'date' || s.type === 'slot')

  useEffect(() => {
    if (hasDateStep && !values.date) setVal('date', todayStr())
  }, [])

  useEffect(() => {
    if (!slotStep || !values.date) return
    const dateStr = values.date as string
    fetch(`/api/services/${slotStep.serviceId}/availability?date=${dateStr}`)
      .then(r => r.json())
      .then(res => {
        const data = res?.data ?? res
        setSlotAvailability(prev => ({ ...prev, [slotStep.key]: data }))
      })
      .catch(() => {})
    setVal('slot', undefined)
  }, [slotStep?.serviceId, values.date])

  function setVal(key: string, value: unknown) {
    if (taskType === 'food' && key === 'time') {
      const newPeriod = periodFromTime(value as string)
      if (values.time && periodFromTime(values.time as string) !== newPeriod) setCart({})
      if (newPeriod === 'none') {
        setErrors(prev => ({ ...prev, [key]: t('validation.invalidTime') }))
      } else {
        setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
      }
    }
    setValues(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  function setQty(id: string, delta: number) {
    setCart(prev => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }
      if (next[id] === 0) delete next[id]
      return next
    })
    const menuStep = steps.find(s => s.type === 'menu')
    if (menuStep) setErrors(prev => { const n = { ...prev }; delete n[menuStep.key]; return n })
  }

  function handleClose() {
    setStep('edit')
    setValues({})
    setCart({})
    setErrors({})
    onClose()
  }

  useEffect(() => {
    if (cooldown <= 0) return
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [cooldown])

  function handleSubmit() {
    if (!navigator.onLine) return

    const validationErrors = validate(steps, values, cart)

    if (values.time) {
      const selectedDate = (values.date as string) || todayStr()
      const selectedTime = values.time as string
      const [h, m] = selectedTime.split(':').map(Number)
      const selected = new Date(selectedDate)
      selected.setHours(h, m, 0, 0)
      const minAllowed = new Date()
      if (taskType === 'food') {
        minAllowed.setHours(minAllowed.getHours() + FOOD_MIN_ADVANCE_HOURS)
      } else {
        minAllowed.setMinutes(minAllowed.getMinutes() + GENERAL_MIN_ADVANCE_MINUTES)
      }
      if (selected < minAllowed) {
        validationErrors.time = taskType === 'food'
          ? 'Заказ еды возможен минимум за 1 час'
          : `Выберите время не менее чем за ${GENERAL_MIN_ADVANCE_MINUTES} минут`
      }
    }

    if (taskType === 'food' && values.time && !validationErrors.time) {
      if (periodFromTime(values.time as string) === 'none') {
        validationErrors.time = t('validation.invalidTime')
      }
    }

    if (values.slot && !validationErrors.slot) {
      const selectedDate = (values.date as string) || todayStr()
      const [h, m] = (values.slot as string).split(':').map(Number)
      const selected = new Date(selectedDate)
      selected.setHours(h, m, 0, 0)
      const minAllowed = new Date()
      minAllowed.setMinutes(minAllowed.getMinutes() + GENERAL_MIN_ADVANCE_MINUTES)
      if (selected < minAllowed) {
        validationErrors.slot = `Выберите время не менее чем за ${GENERAL_MIN_ADVANCE_MINUTES} минут`
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const cartItems: TaskItem[] = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => {
        const ms = steps.find(s => s.type === 'menu')
        if (ms && ms.type === 'menu') {
          const item = ms.items.find(i => i.id === id)
          if (item) return { menuItemId: id, name: item.name, price: item.price, quantity }
        }
        return { menuItemId: id, name: id, price: 0, quantity }
      })

    const catalogItems: TaskItem[] = []
    steps.filter(s => s.type === 'catalog').forEach(s => {
      if (s.type === 'catalog') {
        s.items.filter(i => values[`${s.key}_selected_${i.id}`]).forEach(i => {
          catalogItems.push({ menuItemId: i.id, name: i.name, price: i.price, quantity: 1 })
        })
      }
    })

    const allItems = [...cartItems, ...catalogItems]
    const payload: Record<string, unknown> = { houseId, type: taskType }

    if (values.time) {
      const dateStr = (values.date as string) || todayStr()
      payload.desiredAt = new Date(`${dateStr}T${values.time as string}:00`).toISOString()
    }
    if (values.slot) {
      const dateStr = (values.date as string) || todayStr()
      payload.desiredAt = new Date(`${dateStr}T${values.slot as string}:00`).toISOString()
      payload.slotTime = values.slot as string
    }
    if (taskType === 'food' && values.time) payload.period = periodFromTime(values.time as string)
    if (values.location) payload.location = values.location
    if (values.city) {
      payload.location = values.city
      if (values.cityPrice) payload.priceFix = values.cityPrice
      if (values.cityKm) payload.km = values.cityKm
    }
    if (values.geo) payload.geo = values.geo
    if (values.guestCount) payload.guestCount = values.guestCount
    if (taskType === 'custom' && serviceName) {
      payload.description = values.comment ? `[${serviceName}] ${values.comment}` : serviceName
      payload.serviceName = serviceName
    }
    if (allItems.length > 0) payload.items = allItems

    apiPost('/api/tasks', payload)
      .then(() => { setStep('success'); setCooldown(5) })
      .catch(() => { setErrors({ submit: 'Ошибка отправки' }) })
  }

  const menuStep = steps.find(s => s.type === 'menu')
  const cartItems = menuStep && menuStep.type === 'menu'
    ? Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => {
        const item = menuStep.items.find(i => i.id === id)
        if (!item) return null
        return { name: item.name, price: item.price, qty, subcat: (item as MenuItem).subcat ?? 'default' }
      }).filter(Boolean) as { name: string; price: number; qty: number; subcat: string }[]
    : []

  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.qty, 0)

  const pricingInfo = (() => {
    if (cartItems.length === 0 || !guestCount) return null
    const bySubcat = new Map<string, { qty: number; price: number }>()
    for (const item of cartItems) {
      const cur = bySubcat.get(item.subcat) ?? { qty: 0, price: 0 }
      cur.qty += item.qty
      cur.price += item.price * item.qty
      bySubcat.set(item.subcat, cur)
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
    return { totalExtra, totalExtraPrice, details, exceeds: totalExtra > 0 }
  })()

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {step === 'edit' && (
        <div className="p-6 space-y-5">
          {hint && <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-200 dark:border-amber-500/20">{hint}</p>}
          {steps.map(s => {
            if (s.type === 'city') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <CityAutocomplete cities={transfers ?? []} value={(values[s.key] as string) || ''} onChange={(city) => { if (city) { setVal(s.key, city.name); setVal('cityPrice', city.price); setVal('cityKm', city.km) } else { setVal(s.key, ''); setVal('cityPrice', 0); setVal('cityKm', 0) } }} />
                {errors[s.key] && <ErrorMsg text={errors[s.key]} />}
                <p className="text-[10px] text-gray-400 dark:text-white/30 mt-2">{t('transfer.accuracyHint')}</p>
              </div>
            )
            if (s.type === 'slot') {
              const liveSlots = slotAvailability[s.key] ?? s.slots
              return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                {liveSlots.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-white/40">{!values.date ? t('booking.selectDateFirst') : t('booking.noSlots')}</p>
                ) : (
                <div className="space-y-2">
                  {liveSlots.map(slot => {
                    const remaining = slot.limit - slot.booked
                    const isFull = remaining <= 0
                    const isSelected = values[s.key] === slot.time
                    return (
                      <button key={slot.time} type="button" disabled={isFull}
                        onClick={() => setVal(s.key, slot.time)}
                        className={`w-full p-3 rounded-xl text-sm font-medium border transition-colors flex justify-between items-center ${isSelected ? 'bg-glamp-600 border-glamp-600 text-white' : isFull ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30 cursor-not-allowed' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10'}`}>
                        <span>{slot.time}</span>
                        <span className={`text-xs ${isFull ? 'text-red-400' : remaining === 1 ? 'text-amber-500' : 'opacity-60'}`}>
                          {isFull ? t('booking.full') : remaining === slot.limit ? t('booking.available') : t('booking.remaining', { count: remaining, limit: slot.limit })}
                        </span>
                      </button>
                    )
                  })}
                </div>
                )}
                {errors[s.key] && <ErrorMsg text={errors[s.key]} />}
              </div>
            )}
            if (s.type === 'date') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <input type="date" value={(values[s.key] as string) || todayStr()} min={todayStr()} max={tomorrowStr()} lang="ru"
                  onChange={e => setVal(s.key, e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm text-gray-800 dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-glamp-500 [color-scheme:dark] ${errors[s.key] ? 'border-red-400 dark:border-red-400' : 'border-gray-200 dark:border-white/10'}`} />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setVal(s.key, todayStr())} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${(values[s.key] || todayStr()) === todayStr() ? 'bg-glamp-600 border-glamp-600 text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5'}`}>{t('food.today')}</button>
                  <button onClick={() => setVal(s.key, tomorrowStr())} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${(values[s.key] || todayStr()) === tomorrowStr() ? 'bg-glamp-600 border-glamp-600 text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5'}`}>{t('food.tomorrow')}</button>
                </div>
                <ErrorMsg text={errors[s.key]} />
              </div>
            )

            if (s.type === 'time') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                {taskType === 'food' && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70 mb-2 inline-block">
                    {t('validation.minAdvanceTime')}
                  </span>
                )}
                <input type="time" value={(values[s.key] as string) || ''} min={getMinTime((values.date as string) || todayStr())}
                  onChange={e => setVal(s.key, e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm text-gray-800 dark:text-white bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-glamp-500 [color-scheme:dark] ${errors[s.key] ? 'border-red-400 dark:border-red-400' : 'border-gray-200 dark:border-white/10'}`} />
                {taskType === 'food' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SLOTS.map(slot => (
                      <span key={slot.period} className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70">
                        {t(`food.${slot.period}`)}: {String(slot.slotStart).padStart(2, '0')}:00–{String(slot.slotEnd).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>
                )}
                <ErrorMsg text={errors[s.key]} />
              </div>
            )

            if (s.type === 'select') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <div className={`grid gap-2 ${s.options.length <= 3 ? `grid-cols-${s.options.length}` : 'grid-cols-2'}`}>
                  {s.options.map(opt => (
                    <button key={opt.value} onClick={() => setVal(s.key, opt.value)}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${values[s.key] === opt.value ? 'bg-glamp-600 border-glamp-600 text-white' : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <ErrorMsg text={errors[s.key]} />
              </div>
            )

            if (s.type === 'number') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setVal(s.key, Math.max(s.min ?? 1, ((values[s.key] as number) || (s.min ?? 1)) - 1))} className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/20 text-gray-600 dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-lg">−</button>
                  <span className="text-lg font-bold text-gray-800 dark:text-white w-8 text-center">{(values[s.key] as number) || s.min || 1}</span>
                  <button onClick={() => setVal(s.key, Math.min(s.max ?? 99, ((values[s.key] as number) || (s.min ?? 1)) + 1))} className="w-10 h-10 rounded-full bg-glamp-600 hover:bg-glamp-700 text-white flex items-center justify-center transition-colors text-lg">+</button>
                </div>
              </div>
            )

            if (s.type === 'text') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <input type="text" inputMode="text" value={(values[s.key] as string) || ''} placeholder={s.placeholder}
                  onChange={e => setVal(s.key, e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm text-gray-800 dark:text-white bg-white dark:bg-white/5 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-glamp-500 ${errors[s.key] ? 'border-red-400 dark:border-red-400' : 'border-gray-200 dark:border-white/10'}`} />
                <ErrorMsg text={errors[s.key]} />
              </div>
            )

            if (s.type === 'textarea') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <textarea inputMode="text" value={(values[s.key] as string) || ''} placeholder={s.placeholder} rows={3}
                  onChange={e => setVal(s.key, e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm text-gray-800 dark:text-white bg-white dark:bg-white/5 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-glamp-500 resize-none ${errors[s.key] ? 'border-red-400 dark:border-red-400' : 'border-gray-200 dark:border-white/10'}`} />
                <ErrorMsg text={errors[s.key]} />
              </div>
            )

            if (s.type === 'menu') {
              const selectedTime = values.time as string | undefined
              const period = selectedTime ? periodFromTime(selectedTime) : null

              if (taskType === 'food' && (!selectedTime || period === 'none')) {
                return (
                  <div key={s.key}>
                    <label className="text-xs font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">
                      {t('food.menu')}{s.required && ' *'}
                    </label>
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-center border border-dashed border-gray-200 dark:border-white/10">
                      <p className="text-sm text-gray-400 dark:text-white/40">{t('food.selectTimeFirst')}</p>
                    </div>
                  </div>
                )
              }

              const filteredItems = taskType === 'food' && period
                ? s.items.filter(i => i.isAvailable && ('category' in i && (i as { category: string }).category === period))
                : s.items.filter(i => i.isAvailable)

              const useSubcats = taskType === 'food' && period && (period === 'breakfast' || period === 'lunch' || period === 'dinner')

              if (useSubcats) {
                const subcatOrder = period === 'breakfast' ? ['drinks', 'main'] : ['drinks', 'appetizers', 'first', 'hot', 'sides', 'desserts']
                const grouped = subcatOrder
                  .map(sc => ({
                    subcat: sc,
                    label: t(`food.${sc}`),
                    items: filteredItems.filter(i => (i as MenuItem).subcat === sc),
                  }))
                  .filter(g => g.items.length > 0)

                return (
                  <div key={s.key}>
                    <label className="text-xs font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">
                      {t('food.menu')} ({t(`food.${period}`)}){s.required && ' *'}
                    </label>
                    <div className="space-y-4">
                      {grouped.map(group => (
                        <div key={group.subcat}>
                          <button type="button" onClick={() => toggleSubcat(group.subcat)} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                            <span className="text-xs text-gray-400 dark:text-white/30 transition-transform">{collapsedSubcats.has(group.subcat) ? '▶' : '▼'}</span>
                            <p className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-glamp-50 dark:bg-glamp-500/10 border border-glamp-200 dark:border-glamp-500/20 text-glamp-700 dark:text-green-400 inline-block">{group.label}</p>
                            <span className="text-[10px] text-gray-400 dark:text-white/30">{group.items.length}</span>
                          </button>
                          {!collapsedSubcats.has(group.subcat) && (
                            <div className="space-y-2">
                              {group.items.map(item => (
                                <div key={item.id} className="flex bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-xl p-3 shadow-sm items-center gap-3">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 dark:text-white text-base leading-tight">{item.name}</h4>
                                    {item.description && <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{item.description}</p>}
                                    <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">{item.price} ₽</p>
                                  </div>
                                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg p-0.5 border border-gray-200 dark:border-white/10">
                                    <button onClick={() => setQty(item.id, -1)} disabled={!cart[item.id]}
                                      className="w-8 h-8 flex justify-center items-center rounded-md bg-white dark:bg-white/10 shadow-sm text-gray-600 dark:text-white/60 font-bold text-base active:scale-95 disabled:opacity-30 transition-all">−</button>
                                    <span className="w-5 text-center font-bold text-sm text-gray-800 dark:text-white">{cart[item.id] ?? 0}</span>
                                    <button onClick={() => setQty(item.id, +1)}
                                      className="w-8 h-8 flex justify-center items-center rounded-md bg-glamp-600 text-white shadow-sm font-bold text-base active:scale-95 transition-all">+</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <ErrorMsg text={errors[s.key]} />
                  </div>
                )
              }

              return (
                <div key={s.key}>
                  <label className="text-xs font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">
                    {taskType === 'food' && period ? `${t('food.menu')} (${t(`food.${period}`)})` : t('food.menu')}{s.required && ' *'}
                  </label>
                  <div className="space-y-2">
                    {filteredItems.map(item => (
                      <div key={item.id} className="flex bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-xl p-3 shadow-sm items-center gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 dark:text-white text-base leading-tight">{item.name}</h4>
                          {item.description && <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{item.description}</p>}
                          <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">{item.price} ₽</p>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg p-0.5 border border-gray-200 dark:border-white/10">
                          <button onClick={() => setQty(item.id, -1)} disabled={!cart[item.id]}
                            className="w-8 h-8 flex justify-center items-center rounded-md bg-white dark:bg-white/10 shadow-sm text-gray-600 dark:text-white/60 font-bold text-base active:scale-95 disabled:opacity-30 transition-all">−</button>
                          <span className="w-5 text-center font-bold text-sm text-gray-800 dark:text-white">{cart[item.id] ?? 0}</span>
                          <button onClick={() => setQty(item.id, +1)}
                            className="w-8 h-8 flex justify-center items-center rounded-md bg-glamp-600 text-white shadow-sm font-bold text-base active:scale-95 transition-all">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ErrorMsg text={errors[s.key]} />
                </div>
              )
            }

            if (s.type === 'catalog') return (
              <div key={s.key}>
                <label className="text-sm font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2 block">{s.label}{s.required && ' *'}</label>
                <div className="space-y-2">
                  {s.items.filter(i => i.isAvailable).map(item => (
                    <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${values[`${s.key}_selected_${item.id}`] ? 'border-glamp-500 bg-glamp-50 dark:bg-glamp-500/10' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={!!values[`${s.key}_selected_${item.id}`]}
                          onChange={e => setVal(`${s.key}_selected_${item.id}`, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-glamp-600 focus:ring-glamp-500" />
                        <span className="text-sm text-gray-800 dark:text-white">{item.name}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-white/50">{item.price} ₽</span>
                    </label>
                  ))}
                </div>
                <ErrorMsg text={errors[s.key]} />
              </div>
            )

            return null
          })}

          {cartItems.length > 0 && pricingInfo && (
            <div className="space-y-1">
              {pricingInfo.exceeds ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600 dark:text-amber-400">{t('food.extraDish')}: {pricingInfo.totalExtra}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{pricingInfo.totalExtraPrice} ₽</span>
                  </div>
                  {pricingInfo.details.map(d => (
                    <div key={d.label} className="flex justify-between text-xs text-amber-500 dark:text-amber-400/70">
                      <span>{t(`food.${d.label}`) || d.label}: +{d.extra}</span>
                      <span>+{d.price} ₽</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-sm text-gray-600 dark:text-white/50">
                  {t('food.subtotal')}: {cartItems.reduce((s, i) => s + i.qty, 0)}
                </div>
              )}
            </div>
          )}

          {Object.keys(errors).filter(k => k !== 'submit').length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 space-y-1">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{t('validation.fixErrors')}</p>
              {Object.entries(errors)
                .filter(([k, msg]) => k !== 'submit' && msg)
                .map(([key, msg]) => (
                  <p key={key} className="text-xs text-red-500 dark:text-red-400">• {msg}</p>
                ))}
            </div>
          )}

          <button onClick={handleSubmit} disabled={cooldown > 0}
            className="w-full bg-glamp-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-glamp-700 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
            {cooldown > 0 ? `Подождите · ${cooldown}с` : t('food.submit')}
          </button>
        </div>
      )}

      {step === 'success' && <SuccessScreen title={t('food.success')} message={t('food.successMsg')} onClose={handleClose} />}
    </Modal>
  )
}
