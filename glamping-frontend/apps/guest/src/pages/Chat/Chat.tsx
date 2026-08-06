import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@glamping/ui'
import { useApi, apiPost } from '@glamping/api'
import type { Message } from '@glamping/types'
import { useDevice } from '../../contexts/DeviceContext'

export default function Chat() {
  const { t, i18n } = useTranslation()
  const { houseId } = useDevice()
  const { data: initialMessages } = useApi<Message[]>(houseId ? `/api/messages?houseId=${houseId}` : '')
  const [messages, setMessages] = useState<Message[]>([])
  const [msg, setMsg] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (initialMessages) setMessages(initialMessages) }, [initialMessages])

  useEffect(() => {
    const handler = (e: Event) => {
      if (justSentRef.current) return
      const msg = (e as CustomEvent<Message>).detail
      if (msg.houseId === houseId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    }
    window.addEventListener('glamp:message:new', handler)
    return () => window.removeEventListener('glamp:message:new', handler)
  }, [houseId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const [sending, setSending] = useState(false)
  const justSentRef = useRef(false)

  async function handleSend() {
    if (!msg.trim() || sending || !houseId) return
    setSending(true)
    justSentRef.current = true
    const text = msg
    setMsg('')
    setMessages(prev => [...prev, { id: `temp-${Date.now()}`, houseId, sender: 'GUEST', text, timestamp: new Date().toISOString(), read: true }])
    try {
      const result = await apiPost<Message>('/api/messages', { houseId, text })
      setMessages(prev => prev.map(m => m.id.startsWith('temp-') && m.text === text ? { ...m, id: result.id } : m))
    } catch {
      setMessages(prev => prev.filter(m => !(m.id.startsWith('temp-') && m.text === text)))
    } finally {
      setSending(false)
      setTimeout(() => { justSentRef.current = false }, 2000)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-[#1a1d27] p-4 pl-20 border-b border-gray-100 dark:border-white/10 shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-glamp-100 dark:bg-glamp-500/20 rounded-full flex items-center justify-center text-glamp-600 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          </div>
          <div>
            <h2 className="font-bold text-base text-gray-800 dark:text-gray-200">{t('chat.admin')}</h2>
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> {t('chat.online')}</p>
          </div>
        </div>
        <ThemeToggle size="lg" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-glamp-50 dark:bg-[#0f1117] transition-colors">
        {messages.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">{t('chat.empty')}</p>}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'GUEST' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-3 rounded-2xl ${m.sender === 'GUEST' ? 'bg-glamp-600 text-white rounded-br-sm' : 'bg-white dark:bg-[#1a1d27] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm'}`}>
              <p className="text-base">{m.text}</p>
              <span className={`text-xs mt-1 block ${m.sender === 'GUEST' ? 'text-glamp-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {new Date(m.timestamp).toLocaleTimeString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-3 bg-white dark:bg-[#1a1d27] border-t border-gray-200 dark:border-white/10 transition-colors">
        <div className="flex gap-2 bg-gray-50 dark:bg-white/5 p-1.5 rounded-full border border-gray-200 dark:border-white/10">
          <input type="text" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t('chat.placeholder')} className="flex-1 bg-transparent px-3 outline-none text-base text-gray-800 dark:text-gray-200 placeholder:text-gray-500 dark:placeholder:text-gray-500" />
          <button onClick={handleSend} disabled={sending || !msg.trim()} className="w-10 h-10 bg-glamp-600 text-white rounded-full flex items-center justify-center hover:bg-glamp-700 shadow-md active:scale-95 transition-all disabled:opacity-40">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
