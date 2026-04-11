/**
 * キャッシュ情報バナー (F-017)
 * F-020: i18n対応
 */
import { useLanguage } from '../contexts/LanguageContext'

export default function CacheInfo({ cacheInfo, devMode, onRefresh, refreshing }) {
  const { t } = useLanguage()

  if (!cacheInfo) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#1e3347] border border-[#2a475e] rounded-lg px-4 py-3 text-xs text-[#acb2b8]">
      <div className="flex items-center gap-2 flex-wrap">
        {devMode && (
          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-medium">
            {t('cache.devMode')}
          </span>
        )}
        {cacheInfo.cached ? (
          <span>
            {t('cache.cached')}
            {cacheInfo.age_minutes != null && (
              <> {t('cache.ageLabel', { minutes: cacheInfo.age_minutes })}</>
            )}
          </span>
        ) : (
          <span>{t('cache.fresh')}</span>
        )}
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[#1a9fff] hover:text-[#66c0f4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('cache.refreshAriaLabel')}
        >
          <svg
            className={['w-3.5 h-3.5', refreshing ? 'animate-spin' : ''].join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? t('cache.refreshing') : t('cache.refresh')}
        </button>
      )}
    </div>
  )
}
