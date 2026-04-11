/**
 * エラー表示コンポーネント
 * F-020: i18n対応
 */
import { useLanguage } from '../contexts/LanguageContext'

export default function ErrorDisplay({ error, onRetry }) {
  const { t } = useLanguage()

  if (!error) return null

  if (error.type === 'PROFILE_PRIVATE') {
    const detail = error.detail || {}
    const steps = detail.how_to_fix || []
    const settingsUrl = detail.steam_settings_url || 'https://steamcommunity.com/my/edit/settings'

    return (
      <div className="bg-[#1e3a4a] border border-[#e87b15] rounded-lg p-6 max-w-2xl mx-auto">
        {/* アイコン + タイトル */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#e87b15]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#e87b15]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[#e87b15] font-bold text-lg leading-tight mb-1">
              {t('error.profilePrivate.title')}
            </h3>
            <p className="text-[#c6d4df] text-sm">
              {detail.message || t('error.profilePrivate.message')}
            </p>
          </div>
        </div>

        {/* 手順 */}
        {steps.length > 0 && (
          <div className="mb-5">
            <h4 className="text-white font-semibold text-sm mb-3">{t('error.profilePrivate.stepsTitle')}</h4>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#c6d4df]">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1a9fff]/20 text-[#1a9fff] text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* リンク + リトライ */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={settingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#1a9fff] hover:bg-[#66c0f4] text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {t('error.profilePrivate.openSettings')}
          </a>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 bg-[#2a475e] hover:bg-[#316282] text-[#c6d4df] font-semibold px-4 py-2 rounded text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('error.profilePrivate.retry')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // 汎用エラー
  const isNetwork = error.type === 'NETWORK_ERROR'
  return (
    <div className="bg-[#2a1a1a] border border-[#c94f4f] rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#c94f4f]/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#c94f4f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-[#c94f4f] font-bold text-lg leading-tight mb-1">
            {isNetwork ? t('error.network.title') : t('error.general.title')}
          </h3>
          <p className="text-[#c6d4df] text-sm">
            {error.message || t('error.general.message')}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-[#2a475e] hover:bg-[#316282] text-[#c6d4df] font-semibold px-4 py-2 rounded text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('error.retry')}
        </button>
      )}
    </div>
  )
}
