import { useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
import ShareButton from './ShareButton'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * 年間まとめレポート (F-015)
 * F-020: i18n対応
 */

const CURRENT_YEAR = new Date().getFullYear()

function buildSlides(player, summary) {
  const name = player?.personaname || player?.name || 'Steamユーザー'
  const totalHours = summary?.total_playtime_hours ?? 0
  const topGame = summary?.top_game?.name ?? '—'
  const topGameHours = summary?.top_game ? Math.round((summary.top_game.playtime_forever ?? 0) / 60) : 0
  const totalGames = summary?.total_games ?? 0

  return [
    { id: 'title', type: 'title', year: CURRENT_YEAR, name },
    { id: 'total-hours', type: 'total-hours', totalHours },
    { id: 'top-game', type: 'top-game', topGame, topGameHours },
    { id: 'game-count', type: 'game-count', totalGames },
    { id: 'ending', type: 'ending' },
  ]
}

function SlideContent({ slide, t, lang }) {
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  switch (slide.type) {
    case 'title':
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1a9fff22] border border-[#1a9fff44] flex items-center justify-center mb-2">
            <svg className="w-9 h-9 text-[#1a9fff]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
            </svg>
          </div>
          <p className="text-[#1a9fff] text-sm font-semibold tracking-widest uppercase">
            {t('annual.slide.title.service')}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight whitespace-pre-line">
            {t('annual.slide.title.heading', { year: slide.year })}
          </h2>
          <p className="text-[#acb2b8] text-base mt-1">
            {t('annual.slide.title.subheading', { name: slide.name })}
          </p>
        </div>
      )

    case 'total-hours': {
      let comment
      if (slide.totalHours >= 8760) comment = t('annual.slide.hours.comment.extreme')
      else if (slide.totalHours >= 1000) comment = t('annual.slide.hours.comment.master')
      else if (slide.totalHours >= 500) comment = t('annual.slide.hours.comment.active')
      else if (slide.totalHours >= 100) comment = t('annual.slide.hours.comment.regular')
      else comment = t('annual.slide.hours.comment.beginner')

      const playedText = slide.totalHours >= 24
        ? t('annual.slide.hours.days', { days: Math.floor(slide.totalHours / 24), hours: slide.totalHours % 24 })
        : t('annual.slide.hours.hoursOnly', { hours: slide.totalHours })

      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <p className="text-[#acb2b8] text-sm font-medium tracking-wider uppercase">
            {t('annual.slide.hours.label')}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-6xl sm:text-7xl font-extrabold text-[#1a9fff] leading-none tabular-nums">
              {slide.totalHours.toLocaleString(locale)}
            </span>
            <span className="text-2xl font-bold text-[#66c0f4] mb-2">{t('annual.slide.hours.unit')}</span>
          </div>
          <p className="text-[#acb2b8] text-sm mt-2">{comment}</p>
          <div className="mt-3 px-4 py-2 bg-[#1a9fff11] rounded-full border border-[#1a9fff33]">
            <p className="text-[#66c0f4] text-xs">
              {playedText} {t('annual.slide.hours.playedLabel')}
            </p>
          </div>
        </div>
      )
    }

    case 'top-game':
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <p className="text-[#acb2b8] text-sm font-medium tracking-wider uppercase">
            {t('annual.slide.topGame.label')}
          </p>
          <div className="w-14 h-14 rounded-xl bg-[#f4b63d22] border border-[#f4b63d44] flex items-center justify-center my-1">
            <svg className="w-8 h-8 text-[#f4b63d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white px-4 leading-tight">
            {slide.topGame}
          </h3>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-4xl font-extrabold text-[#f4b63d] tabular-nums">{slide.topGameHours.toLocaleString(locale)}</span>
            <span className="text-lg font-bold text-[#f4b63d88] mb-1">{t('annual.slide.topGame.unit')}</span>
          </div>
          <p className="text-[#acb2b8] text-sm">{t('annual.slide.topGame.note')}</p>
        </div>
      )

    case 'game-count': {
      let comment
      if (slide.totalGames >= 1000) comment = t('annual.slide.gameCount.comment.collector')
      else if (slide.totalGames >= 500) comment = t('annual.slide.gameCount.comment.huge')
      else if (slide.totalGames >= 100) comment = t('annual.slide.gameCount.comment.varied')
      else comment = t('annual.slide.gameCount.comment.growing')

      const unit = t('annual.slide.gameCount.unit')

      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <p className="text-[#acb2b8] text-sm font-medium tracking-wider uppercase">
            {t('annual.slide.gameCount.label')}
          </p>
          <div className="flex items-end gap-2 my-2">
            <span className="text-6xl sm:text-7xl font-extrabold text-[#57cbde] leading-none tabular-nums">
              {slide.totalGames.toLocaleString(locale)}
            </span>
            {unit && <span className="text-2xl font-bold text-[#57cbde88] mb-2">{unit}</span>}
          </div>
          <p className="text-[#acb2b8] text-sm">{comment}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {Array.from({ length: Math.min(slide.totalGames, 12) }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm bg-[#57cbde] opacity-60"
                style={{ opacity: 0.3 + (i / Math.min(slide.totalGames, 12)) * 0.7 }}
              />
            ))}
            {slide.totalGames > 12 && (
              <span className="text-[#57cbde] text-xs font-bold self-end">+{(slide.totalGames - 12).toLocaleString(locale)}</span>
            )}
          </div>
        </div>
      )
    }

    case 'ending':
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1a9fff22] border border-[#1a9fff44] flex items-center justify-center mb-2" aria-hidden="true">
            <svg className="w-9 h-9 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.01M10 12h.01M6 8h12a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4a2 2 0 012-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12v.01M15 12v.01" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01" />
              <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h1m4-1v2m1-1h1" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight whitespace-pre-line">
            {t('annual.slide.ending.heading')}
          </h2>
          <p className="text-[#acb2b8] text-sm max-w-xs whitespace-pre-line">
            {t('annual.slide.ending.message')}
          </p>
          <div className="mt-2 px-4 py-2 bg-[#1a9fff11] rounded-full border border-[#1a9fff33]">
            <p className="text-[#1a9fff] text-xs font-semibold">{t('annual.slide.ending.tagline')}</p>
          </div>
        </div>
      )

    default:
      return null
  }
}

export default function AnnualReportSection({ player, summary }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const slideRef = useRef(null)
  const { lang, t } = useLanguage()

  const slides = buildSlides(player, summary)
  const totalSlides = slides.length
  const currentSlide = slides[currentIndex]

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + totalSlides) % totalSlides)
  }, [totalSlides])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % totalSlides)
  }, [totalSlides])

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft') goPrev()
    if (e.key === 'ArrowRight') goNext()
  }

  async function handleDownload() {
    if (!slideRef.current || downloading) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: '#0f1a24',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `steam-stats-${CURRENT_YEAR}-slide${currentIndex + 1}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const name = player?.personaname || player?.name || 'Steamユーザー'
  const totalHours = summary?.total_playtime_hours ?? 0
  const topGame = summary?.top_game?.name ?? '—'
  const shareText = t('annual.shareText', { year: CURRENT_YEAR, hours: totalHours, topGame })

  const sharePlayer = { personaname: name }
  const shareSummary = {
    total_playtime_hours: totalHours,
    top_game: { name: topGame, hours: summary?.top_game?.hours ?? 0 },
  }

  return (
    <div className="space-y-5">
      {/* スライドカード */}
      <div
        className="relative rounded-2xl overflow-hidden select-none bg-[#0f1a24]"
        style={{ border: '1px solid #2a475e' }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={t('annual.ariaLabel', { current: currentIndex + 1, total: totalSlides })}
        role="region"
      >
        <div ref={slideRef} className="h-72 sm:h-80 p-8 bg-[#0f1a24]">
          <SlideContent slide={currentSlide} t={t} lang={lang} />
        </div>

        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1b2838cc] hover:bg-[#2a475e] border border-[#2a475e] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a9fff]"
          aria-label={t('annual.prevSlide')}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#1b2838cc] hover:bg-[#2a475e] border border-[#2a475e] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a9fff]"
          aria-label={t('annual.nextSlide')}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" role="tablist" aria-label={t('annual.dotsAriaLabel')}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={t('annual.dotAriaLabel', { n: i + 1 })}
              className={[
                'rounded-full transition-[width] duration-200',
                i === currentIndex
                  ? 'w-5 h-2 bg-[#1a9fff]'
                  : 'w-2 h-2 bg-[#2a475e] hover:bg-[#4a6a8e]',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-[#acb2b8] text-xs" aria-live="polite">
        {t('annual.pageIndicator', { current: currentIndex + 1, total: totalSlides })}
      </p>

      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={[
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl',
            'font-semibold text-sm border transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#1a9fff] focus:ring-offset-2 focus:ring-offset-[#171a21]',
            downloading
              ? 'bg-[#1b2838] border-[#2a475e] text-[#acb2b8] cursor-not-allowed'
              : 'bg-[#2a475e] hover:bg-[#3d6680] border-[#2a475e] text-white cursor-pointer',
          ].join(' ')}
          aria-label={t('annual.downloadAriaLabel')}
        >
          {downloading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{t('annual.downloading')}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{t('annual.download')}</span>
            </>
          )}
        </button>

        <ShareButton player={sharePlayer} summary={shareSummary} customText={shareText} />
      </div>

      <p className="text-[#7a9bb5] text-xs">{t('annual.hint')}</p>
    </div>
  )
}
