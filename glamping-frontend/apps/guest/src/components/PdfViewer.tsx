import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfjsWorker

interface PdfViewerProps {
  url: string
  className?: string
}

export function PdfViewer({ url, className = '' }: PdfViewerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const docRef = useRef<any>(null)
  const scaleRef = useRef(1)
  const zoomDivRef = useRef<HTMLDivElement | null>(null)
  const percentRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const doc = await (pdfjsLib as any).getDocument({ url }).promise
        if (cancelled) return
        docRef.current = doc
        setPageCount(doc.numPages)
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) setError(`PDF: ${e?.message || t('pdf.error')}`)
      }
    }
    load()
    return () => { cancelled = true; docRef.current = null }
  }, [url])

  useEffect(() => {
    if (loading || !docRef.current || !containerRef.current) return
    const doc = docRef.current
    const container = containerRef.current
    container.innerHTML = ''

    const zoomDiv = document.createElement('div')
    zoomDiv.style.transformOrigin = 'top center'
    zoomDiv.style.transform = 'scale(1)'
    container.appendChild(zoomDiv)
    zoomDivRef.current = zoomDiv

    for (let i = 1; i <= doc.numPages; i++) {
      const pageDiv = document.createElement('div')
      pageDiv.className = 'flex justify-center mb-2'
      zoomDiv.appendChild(pageDiv)

      doc.getPage(i).then((page: any) => {
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        page.render({ canvasContext: ctx, viewport } as any).promise.then(() => {
          pageDiv.appendChild(canvas)
        })
      })
    }
  }, [loading, pageCount])

  const applyScale = useCallback((s: number) => {
    scaleRef.current = s
    if (zoomDivRef.current) zoomDivRef.current.style.transform = `scale(${s})`
    if (percentRef.current) percentRef.current.textContent = `${Math.round(s * 100)}%`
  }, [])

  const zoomIn = useCallback(() => applyScale(Math.min(3, Math.round((scaleRef.current + 0.25) * 20) / 20)), [applyScale])
  const zoomOut = useCallback(() => applyScale(Math.max(0.3, Math.round((scaleRef.current - 0.25) * 20) / 20)), [applyScale])
  const zoomReset = useCallback(() => applyScale(1), [applyScale])

  if (error) return <div className="flex items-center justify-center h-full text-red-500 text-sm p-4 text-center">{error}</div>
  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">{t('pdf.loading')}</div>

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#1a1d27] border-b border-gray-200 dark:border-white/10 shrink-0 transition-colors">
        <span className="text-xs text-gray-600 dark:text-white/60">{t('pdf.pageCount', { count: pageCount })}</span>
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">−</button>
          <span ref={percentRef} className="text-xs text-gray-600 dark:text-white/60 min-w-[40px] text-center">100%</span>
          <button onClick={zoomIn} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">+</button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto bg-gray-100 dark:bg-[#0a0c10] p-2 flex justify-center">
        <div ref={containerRef} className="flex flex-col items-center origin-top" />
      </div>
    </div>
  )
}
