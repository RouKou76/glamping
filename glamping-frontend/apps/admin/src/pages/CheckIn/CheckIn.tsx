import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useApi, apiPost } from '@glamping/api'
import type { House, GuestSession, Lang } from '@glamping/types'
import { ConfirmDialog } from '@glamping/ui'
import QRCode from 'qrcode'

const LANG_OPTIONS: { value: Lang; label: string }[] = [{ value: 'ru', label: '🇷🇺 Русский' }, { value: 'en', label: '🇬🇧 English' }, { value: 'zh', label: '🇨🇳 中文' }]

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

export default function CheckIn() {
  const { data: apiHouses, refetch: refetchHouses } = useApi<House[]>('/api/houses')
  const { data: apiSessions, refetch: refetchSessions } = useApi<GuestSession[]>('/api/houses/sessions')
  const [houses, setHouses] = useState<House[]>([])
  const [sessions, setSessions] = useState<GuestSession[]>([])
  const [showForm, setShowForm] = useState(false); const [selectedHouse, setSelectedHouse] = useState<House | null>(null)
  const [formGuests, setFormGuests] = useState<number>(1); const [formLang, setFormLang] = useState<Lang>('ru')
  const [tokenModal, setTokenModal] = useState<{ number: number; token: string; hid: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [tabletHouse, setTabletHouse] = useState<House | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  function getTabletUrl(token: string, hid: string) {
    return import.meta.env.DEV
      ? `http://${window.location.hostname}:5173?token=${token}&hid=${hid}`
      : `http://${window.location.hostname}?token=${token}&hid=${hid}`
  }

  useEffect(() => {
    if (!tokenModal || !qrCanvasRef.current) return
    const url = getTabletUrl(tokenModal.token, tokenModal.hid)
    QRCode.toCanvas(qrCanvasRef.current, url, { width: 180, margin: 1 })
  }, [tokenModal])

  useEffect(() => { if (apiHouses) setHouses(apiHouses) }, [apiHouses])
  useEffect(() => { if (apiSessions) setSessions(apiSessions) }, [apiSessions])

  function openCheckIn(house: House) { setSelectedHouse(house); setFormGuests(2); setFormLang('ru'); setShowForm(true) }
  function handleCheckIn() {
    if (!selectedHouse) return
    setHouses(prev => prev.map(h => h.id === selectedHouse.id ? { ...h, status: 'occupied' } : h))
    apiPost(`/api/houses/${selectedHouse.id}/check-in`, { guestCount: formGuests, lang: formLang }).then(() => refetchSessions()).catch(() => {})
    setShowForm(false)
  }
  const [checkoutId, setCheckoutId] = useState<string | null>(null)
  function handleCheckoutConfirm() {
    if (checkoutId) {
      setHouses(prev => prev.map(h => h.id === checkoutId ? { ...h, status: 'vacant' } : h))
      apiPost(`/api/houses/${checkoutId}/check-out`, {}).then(() => refetchSessions()).catch(() => {})
    }
    setCheckoutId(null)
  }
  function formatCheckIn(iso: string): string { return new Date(iso).toLocaleString('ru', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) }

  function handleSetupTablet(house: House) {
    setTabletHouse(house)
  }

  async function confirmSetupTablet() {
    if (!tabletHouse) return
    try {
      const res = await apiPost<{ houseId: string; number: number; deviceToken: string }>(`/api/houses/${tabletHouse.id}/device-token`, {})
      setTokenModal({ number: res.number, token: res.deviceToken, hid: res.houseId })
      setCopied(false)
    } catch { /* ignore */ }
    setTabletHouse(null)
  }

  function copyToken() {
    if (!tokenModal) return
    const host = window.location.hostname
    const guestUrl = import.meta.env.DEV ? `http://${host}:5173` : `http://${host}`
    const url = `${guestUrl}?token=${tokenModal.token}&hid=${tokenModal.hid}`

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        fallbackCopy(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      fallbackCopy(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const occupied = houses.filter(h => h.status === 'occupied')
  const vacant = houses.filter(h => h.status === 'vacant')

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Домики</h2><p className="text-xs text-gray-500 dark:text-white/50 mt-1">Заселено: {occupied.length} · Свободно: {vacant.length}</p></div>
      </div>
      {occupied.length > 0 && (
        <section>
          <p className="text-xs font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2">Заселены</p>
          <div className="space-y-3">{occupied.map(house => {
            const session = sessions.find(s => s.houseId === house.id && s.isActive)
            return (
            <div key={house.id} className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-gray-800 dark:text-white">Домик №{house.number}</p>
                  <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">{session?.guestCount ?? '—'} гостей · {LANG_OPTIONS.find(l => l.value === session?.lang)?.label ?? 'Русский'}</p>
                  {session?.checkInAt && <p className="text-xs text-gray-400 dark:text-white/50 mt-0.5">Заезд: {formatCheckIn(session.checkInAt)}</p>}
                </div>
                <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">Занят</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSetupTablet(house)} className="flex-1 py-2 rounded-xl border border-blue-200 dark:border-blue-500/20 text-blue-500 dark:text-blue-400/70 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors active:scale-95">Настроить планшет</button>
                <button onClick={() => setCheckoutId(house.id)} className="flex-1 py-2 rounded-xl border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400/70 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors active:scale-95">Выселить</button>
              </div>
            </div>
          )})}</div>
        </section>
      )}
      {vacant.length > 0 && (
        <section>
          <p className="text-xs font-bold text-gray-600 dark:text-white/50 uppercase tracking-wider mb-2">Свободны</p>
          <div className="space-y-3">{vacant.map(house => (
            <div key={house.id} className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors">
              <div><p className="text-base font-bold text-gray-800 dark:text-white">Домик №{house.number}</p><p className="text-xs text-gray-400 dark:text-white/50 mt-0.5">Свободен</p></div>
              <div className="flex gap-2">
                <button onClick={() => handleSetupTablet(house)} className="px-3 py-2 border border-blue-200 dark:border-blue-500/20 text-blue-500 dark:text-blue-400/70 text-xs font-medium rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors active:scale-95">Планшет</button>
                <button onClick={() => openCheckIn(house)} className="px-4 py-2 bg-glamp-600 text-white text-xs font-bold rounded-xl hover:bg-glamp-700 transition-colors active:scale-95">Заселить</button>
              </div>
            </div>
          ))}</div>
        </section>
      )}
      {showForm && selectedHouse && createPortal(
        <div className="fixed inset-0 z-40 bg-black/60 flex items-end" onClick={() => setShowForm(false)}>
          <div className="w-full bg-gray-50 dark:bg-[#1a1d27] rounded-t-3xl p-6 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Заселение — Домик №{selectedHouse.number}</h3>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-2 block">Количество гостей</label>
              <div className="flex items-center gap-4">
                <button onClick={() => setFormGuests(g => Math.max(1, g - 1))} className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/20 text-gray-600 dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-lg">−</button>
                <span className="text-2xl font-bold text-gray-800 dark:text-white w-8 text-center">{formGuests}</span>
                <button onClick={() => setFormGuests(g => g + 1)} className="w-10 h-10 rounded-full bg-glamp-600 hover:bg-glamp-700 text-white flex items-center justify-center transition-colors text-lg">+</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-white/60 mb-2 block">Язык планшета</label>
              <div className="grid grid-cols-3 gap-2">{LANG_OPTIONS.map(opt => (<button key={opt.value} onClick={() => setFormLang(opt.value)} className={`py-2.5 rounded-xl text-xs font-medium border transition-colors ${formLang === opt.value ? 'bg-glamp-600 border-glamp-600 text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5'}`}>{opt.label}</button>))}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Отмена</button>
              <button onClick={handleCheckIn} className="py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 text-white text-sm font-bold transition-colors active:scale-95">Заселить</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {tokenModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setTokenModal(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1d27] rounded-2xl p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white text-center">Настройка планшета</h3>
            <p className="text-sm text-gray-500 dark:text-white/60 text-center">Домик №{tokenModal.number}</p>
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 space-y-3">
              <p className="text-xs text-gray-500 dark:text-white/50 text-center">Отсканируйте QR-код на планшете:</p>
              <div className="flex justify-center">
                <canvas ref={qrCanvasRef} className="rounded-lg" />
              </div>
              <div className="border-t border-gray-200 dark:border-white/10 pt-3">
                <p className="text-xs text-gray-500 dark:text-white/50 mb-1">или введите ссылку вручную:</p>
                <p className="text-sm font-mono font-bold text-gray-800 dark:text-white break-all select-all">{
                  getTabletUrl(tokenModal.token, tokenModal.hid)
                }</p>
              </div>
            </div>
            <button onClick={copyToken} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-glamp-600 hover:bg-glamp-700 text-white active:scale-95'}`}>
              {copied ? '✓ Скопировано' : 'Копировать код'}
            </button>
            <p className="text-xs text-gray-400 dark:text-white/40 text-center">Введите этот код на планшете гостя</p>
            <button onClick={() => setTokenModal(null)} className="w-full py-2 text-xs text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70">Закрыть</button>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDialog open={!!checkoutId} title="Выселить домик?" message="Домик будет освобождён, чат очищен." confirmLabel="Выселить" onConfirm={handleCheckoutConfirm} onClose={() => setCheckoutId(null)} />
      <ConfirmDialog open={!!tabletHouse} title="Настроить планшет?" message="Будет сгенерирована новая ссылка для планшета." confirmLabel="Настроить" variant="primary" onConfirm={confirmSetupTablet} onClose={() => setTabletHouse(null)} />
    </div>
  )
}
