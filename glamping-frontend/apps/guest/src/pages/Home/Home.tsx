import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@glamping/ui'
import { useApi, apiPost } from '@glamping/api'
import { useTask } from '../../contexts/TaskContext'
import { useDevice } from '../../contexts/DeviceContext'
import type { MenuItem, Service } from '@glamping/types'
import { ServiceTile } from './ServiceTile'
import { ConfirmSheet, type ConfirmSheetType } from './ConfirmSheet'
import { CheckoutSheet } from './CheckoutSheet'
import { OrderForm, type OrderStep } from './OrderForm'

const SERVICE_COLORS: Record<string, string> = { cs1: 'bg-amber-500', cs2: 'bg-emerald-500' }

type ActiveModal = ConfirmSheetType | 'food' | 'minibar' | 'transfer' | 'cleaning' | 'checkout' | null

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { houseId, houseNumber, guestCount, checkoutRequested } = useDevice()
  const { data: services, refetch: refetchServices } = useApi<Service[]>('/api/services')
  const { data: menuItems, refetch: refetchMenuItems } = useApi<MenuItem[]>('/api/menu')
  const { data: transfers } = useApi<{ id: string; name: string; km: number; price: number }[]>('/api/transfers')

  useEffect(() => {
    const handler = () => { refetchServices(); refetchMenuItems() }
    window.addEventListener('glamp:data:refresh', handler)
    return () => window.removeEventListener('glamp:data:refresh', handler)
  }, [refetchServices, refetchMenuItems])
  const activeServices = useMemo(() => services?.filter(s => s.active) ?? [], [services])
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [activeServiceConfig, setActiveServiceConfig] = useState<{ title: string; steps: OrderStep[]; message: string; serviceName: string; hint?: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const SERVICE_CONFIGS: Record<string, { title: string; steps: OrderStep[]; message: string; hint?: string }> = useMemo(() => {
    const items = menuItems ?? []
    return {
    food: {
      title: t('food.title'),
      steps: [
        { type: 'date', key: 'date', label: t('food.date') },
        { type: 'time', key: 'time', label: t('food.time'), required: true },
        { type: 'select', key: 'location', label: t('food.location'), required: true, options: [
          { value: 'cabin', label: t('food.cabin') }, { value: 'gazebo', label: t('food.gazebo') },
        ]},
        { type: 'menu', key: 'items', items: items.filter(i => i.category !== 'minibar'), required: true },
      ],
      message: t('food.successMsg'),
    },
    transfer: {
      title: t('transfer.title'),
      steps: [
        { type: 'city', key: 'city', label: t('transfer.destination'), required: true },
        { type: 'date', key: 'date', label: t('food.date') },
        { type: 'time', key: 'time', label: t('transfer.time'), required: true },
      ],
      message: t('transfer.successMsg'),
    },
    cleaning: {
      title: t('cleaning.title'),
      steps: [
        { type: 'date', key: 'date', label: t('food.date') },
        { type: 'time', key: 'time', label: t('food.time'), required: true },
      ],
      message: t('cleaning.successMsg'),
    },
    towels: {
      title: t('towels.title'),
      steps: [
        { type: 'date', key: 'date', label: t('food.date') },
        { type: 'time', key: 'time', label: t('food.time'), required: true },
      ],
      message: t('towels.success'),
    },
  }
  }, [t, menuItems])

  function buildServiceConfig(service: Service): { title: string; steps: OrderStep[]; message: string; serviceName: string; hint?: string } {
    const steps: OrderStep[] = []
    if (service.requiresTime) {
      steps.push({ type: 'date', key: 'date', label: t('food.date') })
      steps.push({ type: 'time', key: 'time', label: t('food.time'), required: true })
    }
    steps.push({ type: 'textarea', key: 'comment', label: 'Комментарий', placeholder: service.name })
    const hint = service.showDescription && service.description ? service.description : undefined
    return { title: service.name, steps, message: `Заявка «${service.name}» отправлена`, serviceName: service.name, hint }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const isConfirmType = (m: ActiveModal): m is ConfirmSheetType => m === 'gates' || m === 'minibar'

  function handleConfirm(type: ConfirmSheetType) {
    apiPost('/api/tasks', { houseId, type, description: t(`${type}.title`) })
      .then(() => showToast(t(`${type}.success`)))
      .catch(() => showToast('Ошибка отправки'))
  }
  function handleOrderSubmit(_data: Record<string, unknown>, message: string) { showToast(message) }

  function handleCheckout() {
    if (!houseId) return
    apiPost(`/api/houses/${houseId}/checkout-request`, {})
      .then(() => {
        showToast(t('checkout.requested'))
        setActiveModal(null)
      })
      .catch(() => showToast('Ошибка отправки'))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('home.title')}</h1>
        <ThemeToggle size="lg" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t('home.house')}{houseNumber ? ` №${houseNumber}` : ''}</p>

      <div className="grid grid-cols-2 gap-4 animate-slide-up">
        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>} label={t('home.food')} color="bg-orange-500" onClick={() => { refetchServices(); refetchMenuItems(); setActiveModal('food') }} />
        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>} label={t('home.transfer')} color="bg-blue-500" onClick={() => { refetchServices(); setActiveModal('transfer') }} />
        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>} label={t('home.cleaning')} color="bg-teal-500" onClick={() => { refetchServices(); setActiveModal('cleaning') }} />
        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>} label={t('home.towels')} color="bg-cyan-500" onClick={() => { refetchServices(); setActiveModal('towels') }} />
        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>} label={t('home.minibar')} color="bg-purple-500" onClick={() => { refetchServices(); setActiveModal('minibar') }} />

        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>} label={t('home.andetta')} color="bg-rose-500" onClick={() => navigate('/catalog/andetta')} />

        <ServiceTile icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>} label={t('home.suveniry')} color="bg-amber-500" onClick={() => navigate('/catalog/suveniry')} />

        {checkoutRequested ? (
          <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-5 flex flex-col justify-between h-36 transition-colors">
            <div className="p-3 bg-gray-200 dark:bg-white/10 rounded-2xl w-fit">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-white/40"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-500 dark:text-white/40">{t('checkout.requested')}</h3>
            </div>
          </div>
        ) : (
          <div onClick={() => setActiveModal('checkout')}
            className="bg-red-500 text-white rounded-3xl p-5 shadow-md cursor-pointer hover:bg-red-600 transition-all active:scale-95 flex flex-col justify-between h-36 group relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 transform group-hover:scale-110 transition-transform">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <div className="p-2 bg-white/20 rounded-xl w-fit text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
            <h3 className="text-base font-bold">{t('checkout.title')}</h3>
          </div>
        )}

        {activeServices.map(service => (
          <ServiceTile
            key={service.id}
            icon={<span className="text-base">{service.icon || '⭐'}</span>}
            label={service.name}
            sublabel={service.priceInfo}
            color={SERVICE_COLORS[service.id] ?? 'bg-gray-600'}
            onClick={() => { refetchServices(); setActiveServiceConfig(buildServiceConfig(service)) }}
          />
        ))}
      </div>

      {isConfirmType(activeModal) && <ConfirmSheet open={true} type={activeModal} onClose={() => setActiveModal(null)} onConfirm={handleConfirm} />}

      {activeModal === 'checkout' && <CheckoutSheet open={true} onClose={() => setActiveModal(null)} onConfirm={handleCheckout} />}

      {(activeModal === 'food' || activeModal === 'transfer' || activeModal === 'cleaning' || activeModal === 'towels') && activeModal && (
        <OrderForm
          open={true}
          title={SERVICE_CONFIGS[activeModal].title}
          steps={SERVICE_CONFIGS[activeModal].steps}
          houseId={houseId}
          guestCount={guestCount}
          transfers={transfers ?? undefined}
          taskType={activeModal}
          hint={SERVICE_CONFIGS[activeModal].hint}
          onClose={() => setActiveModal(null)}
          onSubmit={() => handleOrderSubmit({}, SERVICE_CONFIGS[activeModal].message)}
        />
      )}

      {activeServiceConfig && (
        <OrderForm
          open={true}
          title={activeServiceConfig.title}
          steps={activeServiceConfig.steps}
          houseId={houseId}
          guestCount={guestCount}
          taskType="custom"
          serviceName={activeServiceConfig.serviceName}
          hint={activeServiceConfig.hint}
          onClose={() => setActiveServiceConfig(null)}
          onSubmit={() => handleOrderSubmit({}, activeServiceConfig.message)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium animate-slide-up z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
