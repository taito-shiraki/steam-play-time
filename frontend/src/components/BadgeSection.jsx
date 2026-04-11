import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { apiUrl } from '../lib/api'

/**
 * プレイ時間バッジ生成セクション (F-013)
 * F-020: i18n対応
 */

const TIERS = [
  { minHours: 5000, titleKey: 'badge.tiers.legend',   color: '#ffd700', descKey: 'badge.tiers.legendDesc' },
  { minHours: 1000, titleKey: 'badge.tiers.master',   color: '#b400ff', descKey: 'badge.tiers.masterDesc' },
  { minHours:  500, titleKey: 'badge.tiers.veteran',  color: '#1e90ff', descKey: 'badge.tiers.veteranDesc' },
  { minHours:  100, titleKey: 'badge.tiers.regular',  color: '#32c850', descKey: 'badge.tiers.regularDesc' },
  { minHours:    0, titleKey: 'badge.tiers.beginner', color: '#a0a0aa', descKey: 'badge.tiers.beginnerDesc' },
]

function getTier(totalHours) {
  for (const tier of TIERS) {
    if (totalHours >= tier.minHours) return tier
  }
  return TIERS[TIERS.length - 1]
}

function getNextTier(totalHours) {
  let next = null
  for (const tier of TIERS) {
    if (tier.minHours > totalHours) next = tier
  }
  return next
}

export default function BadgeSection({ steamId, summary }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const imgRef = useRef(null)
  const { lang, t } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  const totalHours = summary?.total_playtime_hours ?? 0
  const tier = getTier(totalHours)
  const nextTier = getNextTier(totalHours)

  const tierTitle = t(tier.titleKey)
  const tierDesc = t(tier.descKey)
  const nextTierTitle = nextTier ? t(nextTier.titleKey) : null

  const badgeUrl = apiUrl(`/api/badge/image/${steamId}`)

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    const timer = setTimeout(() => {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setImageLoaded(true)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [steamId])

  function handleDownload() {
    const link = document.createElement('a')
    link.href = badgeUrl
    link.download = 'steam_badge.png'
    link.click()
  }

  const progressPercent = nextTier
    ? Math.min(100, Math.round(
        ((totalHours - tier.minHours) / (nextTier.minHours - tier.minHours)) * 100
      ))
    : 100

  return (
    <div className="space-y-6">
      {/* 称号表示 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2"
          style={{ borderColor: tier.color, background: `${tier.color}18` }}
        >
          <svg
            viewBox="0 0 24 28"
            className="w-8 h-8 flex-shrink-0"
            style={{ fill: tier.color }}
            aria-hidden="true"
          >
            <path d="M12 0 L24 4 L24 16 Q24 24 12 28 Q0 24 0 16 L0 4 Z" />
            <path d="M7 13 L10.5 16.5 L17 10" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div>
            <p className="text-xs font-medium" style={{ color: tier.color }}>{t('badge.yourTitle')}</p>
            <p className="text-2xl font-bold text-white leading-tight">{tierTitle}</p>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-[#acb2b8] text-sm">{tierDesc}</p>
          <p className="text-white font-semibold mt-1">
            {t('badge.totalHours')} <span style={{ color: tier.color }}>{totalHours.toLocaleString(locale)} {t('badge.hoursUnit')}</span>
          </p>
          {nextTier && (
            <p className="text-[#acb2b8] text-xs mt-1">
              {t('badge.nextTier', { title: nextTierTitle })} <span className="text-white">{t('badge.nextTierHours', { hours: (nextTier.minHours - totalHours).toFixed(1) })}</span>
            </p>
          )}
          {!nextTier && (
            <p className="text-xs mt-1" style={{ color: tier.color }}>
              {t('badge.maxTitle')}
            </p>
          )}
        </div>
      </div>

      {/* 次の称号までの進捗バー */}
      {nextTier && (
        <div>
          <div className="flex justify-between text-xs text-[#acb2b8] mb-1">
            <span>{tierTitle}</span>
            <span>{nextTierTitle} ({nextTier.minHours.toLocaleString(locale)}h)</span>
          </div>
          <div className="w-full bg-[#1b2838] rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`,
              }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('badge.progressAriaLabel', { percent: progressPercent })}
            />
          </div>
        </div>
      )}

      {/* バッジプレビュー + ダウンロード */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="relative flex-shrink-0">
          {!imageLoaded && !imageError && (
            <div
              className="w-40 h-40 rounded-2xl bg-[#1b2838] border border-[#2a475e] flex items-center justify-center"
              aria-label={t('badge.imageAriaLabel')}
            >
              <svg className="animate-spin w-8 h-8 text-[#1a9fff]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {imageError && (
            <div
              className="w-40 h-40 rounded-2xl bg-[#1b2838] border border-[#2a475e] flex flex-col items-center justify-center gap-2"
              role="alert"
            >
              <svg className="w-10 h-10 text-[#acb2b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[#acb2b8] text-xs text-center">{t('badge.imageError').replace('\\n', '\n')}</p>
            </div>
          )}

          <img
            ref={imgRef}
            src={badgeUrl}
            alt={t('badge.imageAlt', { title: tierTitle })}
            className={[
              'w-40 h-40 rounded-2xl border-2 object-cover',
              imageLoaded ? 'block' : 'hidden',
            ].join(' ')}
            style={{ borderColor: tier.color }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true)
              setImageLoaded(false)
            }}
          />

          {imageLoaded && (
            <div
              className="mt-2 text-center text-xs font-semibold"
              style={{ color: tier.color }}
            >
              {tierTitle}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div>
            <p className="text-white font-semibold mb-1">{t('badge.snsTitle')}</p>
            <p className="text-[#acb2b8] text-sm leading-relaxed">{t('badge.snsDesc')}</p>
          </div>

          <div className="grid grid-cols-1 gap-1">
            <p className="text-[#acb2b8] text-xs font-semibold mb-1">{t('badge.tierListTitle')}</p>
            {TIERS.map((tierItem) => {
              const tTitle = t(tierItem.titleKey)
              const isCurrent = tierItem.titleKey === tier.titleKey
              return (
                <div
                  key={tierItem.titleKey}
                  className={[
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors',
                    isCurrent
                      ? 'bg-[#1b2838] border border-[#2a475e]'
                      : 'opacity-60',
                  ].join(' ')}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: tierItem.color }}
                  />
                  <span className="font-semibold" style={{ color: tierItem.color }}>{tTitle}</span>
                  <span className="text-[#acb2b8]">{t('badge.tierRange', { hours: tierItem.minHours.toLocaleString(locale) })}</span>
                  {isCurrent && (
                    <span
                      className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${tierItem.color}28`, color: tierItem.color }}
                    >
                      {t('badge.currentBadge')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <a
            href={badgeUrl}
            download="steam_badge.png"
            onClick={handleDownload}
            className={[
              'inline-flex items-center justify-center gap-2',
              'px-6 py-3 rounded-xl',
              'font-semibold text-sm',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#171a21]',
              'cursor-pointer select-none',
            ].join(' ')}
            style={{
              backgroundColor: tier.color,
              color: '#fff',
            }}
            aria-label={t('badge.downloadAriaLabel')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('badge.download')}
          </a>
        </div>
      </div>
    </div>
  )
}
