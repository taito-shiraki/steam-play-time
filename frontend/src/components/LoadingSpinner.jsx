/**
 * ローディングスピナー
 * F-020: i18n対応
 */
import { useLanguage } from '../contexts/LanguageContext'

export default function LoadingSpinner({ message }) {
  const { t } = useLanguage()
  const displayMessage = message ?? t('loading.default')

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      {/* スピナー */}
      <div
        className="w-12 h-12 rounded-full border-4 border-[#2a475e] border-t-[#1a9fff] animate-spin"
        role="status"
        aria-label={t('loading.aria')}
      />
      <p className="text-[#acb2b8] text-sm">{displayMessage}</p>
    </div>
  )
}
