import { useState } from 'react'
import { useApi } from '@glamping/api'

interface CatalogInfo {
  current: string | null
  previous: string | null
  active: 'current' | 'previous'
  currentExists: boolean
  previousExists: boolean
}

interface CatalogSectionProps {
  catalogId: string
  title: string
}

function CatalogSection({ catalogId, title }: CatalogSectionProps) {
  const { data, refetch } = useApi<CatalogInfo>(`/api/catalog/${catalogId}`)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  const hasPdf = !!data?.current || !!data?.previous

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    let ok = false
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('glamp-token')
      const res = await fetch(`/api/catalog/${catalogId}/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      ok = res.ok
    } catch {
      // ignore
    }
    if (ok) {
      refetch()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
      if (fileRef.current) fileRef.current.value = ''
    }
    setUploading(false)
  }

  async function handleSwitch(version: 'current' | 'previous') {
    const token = localStorage.getItem('glamp-token')
    await fetch(`/api/catalog/${catalogId}/switch`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ version }),
    })
    refetch()
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>

      {data?.current && (
        <div className={`bg-white dark:bg-[#1a1d27] border rounded-2xl p-4 shadow-sm transition-colors space-y-3 ${data.currentExists ? 'border-gray-100 dark:border-white/10' : 'border-red-300 dark:border-red-500/30'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${data.currentExists ? 'bg-red-100 dark:bg-red-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                {data.currentExists ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-white">Текущая версия</p>
                <p className="text-xs text-gray-500 dark:text-white/50 truncate">{data.current}</p>
              </div>
            </div>
            {data.active === 'current' ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold">Активна</span>
            ) : (
              <button disabled={!data.currentExists} onClick={() => handleSwitch('current')} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Сделать активной</button>
            )}
          </div>
          {!data.currentExists && (
            <p className="text-xs text-red-500 dark:text-red-400">⚠ Файл не найден на сервере. Загрузите заново.</p>
          )}
        </div>
      )}

      {data?.previous && (
        <div className={`bg-white dark:bg-[#1a1d27] border rounded-2xl p-4 shadow-sm transition-colors space-y-3 ${data.previousExists ? 'border-gray-100 dark:border-white/10' : 'border-red-300 dark:border-red-500/30'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${data.previousExists ? 'bg-gray-100 dark:bg-white/5' : 'bg-red-100 dark:bg-red-500/20'}`}>
                {data.previousExists ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/30"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-white">Предыдущая версия</p>
                <p className="text-xs text-gray-500 dark:text-white/50 truncate">{data.previous}</p>
              </div>
            </div>
            {data.active === 'previous' ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold">Активна</span>
            ) : (
              <button disabled={!data.previousExists} onClick={() => handleSwitch('previous')} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">Сделать активной</button>
            )}
          </div>
          {!data.previousExists && (
            <p className="text-xs text-red-500 dark:text-red-400">⚠ Файл не найден на сервере.</p>
          )}
        </div>
      )}

      {!hasPdf && (
        <div className="bg-white dark:bg-[#1a1d27] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center">
          <p className="text-gray-400 dark:text-white/30 text-sm">Каталог ещё не загружен</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1d27] border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-colors space-y-3">
        <p className="text-sm font-bold text-gray-800 dark:text-white">
          {hasPdf ? 'Загрузить новую версию' : 'Загрузить каталог'}
        </p>
        <p className="text-xs text-gray-400 dark:text-white/30">
          {hasPdf ? 'Текущая версия станет предыдущей, самая старая будет удалена' : ''}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="w-full text-sm text-gray-600 dark:text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-glamp-600 file:text-white hover:file:bg-glamp-700 file:cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-2.5 rounded-xl bg-glamp-600 hover:bg-glamp-700 disabled:opacity-50 text-white text-sm font-bold transition-colors active:scale-95"
        >
          {uploading ? 'Загрузка...' : 'Загрузить'}
        </button>
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium">
            ✓ Новая версия загружена
          </p>
        )}
      </div>
    </div>
  )
}

import { useRef } from 'react'

export default function Catalog() {
  return (
    <div className="space-y-6">
      <CatalogSection catalogId="andetta" title="Продукция бренда ANDETTA" />
      <hr className="border-gray-200 dark:border-white/10" />
      <CatalogSection catalogId="suveniry" title="Сувениры и вкусности из Иваново" />
    </div>
  )
}
