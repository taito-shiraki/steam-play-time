/**
 * Twitter/X シェアボタン (F-005)
 * F-020: i18n対応
 */
import { useLanguage } from '../contexts/LanguageContext'

export default function ShareButton({ player, summary, customText }) {
  const { t } = useLanguage()

  if (!player || !summary) return null

  function buildShareText() {
    if (customText) return customText
    const name = player.personaname || player.name || t('share.defaultUser')
    const hours = summary.total_playtime_hours ?? 0
    const topGame = summary.top_game?.name ?? 'N/A'
    return t('share.text', { name, hours, topGame })
  }

  function handleShare() {
    const text = buildShareText()
    const url = window.location.href
    const tweetUrl =
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(tweetUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleShare}
      aria-label={t('share.ariaLabel')}
      className={[
        'inline-flex items-center gap-2',
        'px-5 py-2.5',
        'bg-black hover:bg-[#1a1a1a]',
        'text-white font-semibold text-sm',
        'rounded-full',
        'border border-[#2a2a2a] hover:border-[#555]',
        'transition-all duration-150',
        'cursor-pointer select-none',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#171a21]',
      ].join(' ')}
    >
      {/* X (Twitter) ロゴ */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="w-4 h-4 fill-current"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
      <span>{t('share.buttonText')}</span>
    </button>
  )
}
