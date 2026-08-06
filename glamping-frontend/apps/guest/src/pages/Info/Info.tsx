import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@glamping/ui'
import { useGlampInfo } from '../../contexts/GlampInfoContext'

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
]

export default function Info() {
  const { t, i18n } = useTranslation()
  const { info } = useGlampInfo()

  function changeLang(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('glamp-lang', lang)
  }

  return (
    <div className="p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 pl-16">{info.title}</h1>
        <ThemeToggle size="lg" />
      </div>

      <div className="flex gap-2 mb-6">
        {LANGUAGES.map(lang => (
          <button key={lang.value} onClick={() => changeLang(lang.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${i18n.language === lang.value ? 'bg-glamp-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'}`}>
            {lang.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1a1d27] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 transition-colors">
          <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">{t('info.phone')}</h3>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{info.phone}</p>
        </div>
        <div className="bg-white dark:bg-[#1a1d27] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 transition-colors">
          <h3 className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wider">{t('info.wifi')}</h3>
          <p className="text-base text-gray-800 dark:text-gray-200">{t('info.network')}: <strong>{info.wifiName}</strong></p>
          <p className="text-base text-gray-800 dark:text-gray-200">{t('info.password')}: <strong>{info.wifiPassword}</strong></p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1d27] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 mb-6 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">{t('info.rules')}</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base whitespace-pre-line">{info.rules}</p>
      </div>

      <div className="bg-white dark:bg-[#1a1d27] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 mb-6 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">{t('info.about')}</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">{info.description}</p>
      </div>

      <div className="bg-white dark:bg-[#1a1d27] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 mb-6 transition-colors">
        <h2 className="text-lg font-bold text-glamp-900 dark:text-gray-200 mb-3">{t('info.services')}</h2>
        <p className="text-glamp-600 dark:text-gray-400 leading-relaxed text-base">{info.servicesText}</p>
      </div>
    </div>
  )
}
