import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PdfViewer } from '../../components/PdfViewer'

export default function Catalog() {
  const { catalogId } = useParams<{ catalogId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!catalogId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('catalog.noCatalog')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-[#1a1d27] p-4 border-b border-gray-100 dark:border-white/10 shadow-sm flex items-center gap-3 transition-colors">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className="font-bold text-base text-gray-800 dark:text-gray-200">{catalogId === 'suveniry' ? t('catalog.suveniryTitle') : t('catalog.andettaTitle')}</h2>
      </div>
      <div className="flex-1">
        <PdfViewer url={`/api/catalog/${catalogId}/pdf?v=${Date.now()}`} className="h-full" />
      </div>
    </div>
  )
}
