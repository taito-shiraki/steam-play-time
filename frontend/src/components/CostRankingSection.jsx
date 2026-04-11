/**
 * F-009: コスパランキング（時間あたりコスト）
 * F-020: i18n対応
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function iconUrl(appid, imgIconUrl) {
  if (!appid || !imgIconUrl) return null
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${imgIconUrl}.jpg`
}

function loadPrices(steamId) {
  try {
    const raw = localStorage.getItem(`steam_prices_${steamId}`)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function savePrices(steamId, prices) {
  try {
    localStorage.setItem(`steam_prices_${steamId}`, JSON.stringify(prices))
  } catch {
    // 無視
  }
}

export default function CostRankingSection({ games, steamId }) {
  const { lang, t } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  const [prices, setPrices] = useState({})
  const [inputMode, setInputMode] = useState(false)
  const [inputPage, setInputPage] = useState(0)
  const INPUT_PAGE_SIZE = 10

  useEffect(() => {
    if (!steamId) return
    setPrices(loadPrices(steamId))
  }, [steamId])

  const handlePriceChange = useCallback((appid, value) => {
    setPrices((prev) => {
      const next = { ...prev, [appid]: value }
      if (steamId) savePrices(steamId, next)
      return next
    })
  }, [steamId])

  const ranking = useMemo(() => {
    if (!games) return []
    return games
      .map((g) => {
        const priceStr = prices[g.appid]
        const price = priceStr !== undefined && priceStr !== '' ? parseFloat(priceStr) : NaN
        const hours = (g.playtime_forever ?? 0) / 60
        if (isNaN(price) || price <= 0) return null
        if (hours === 0) return { ...g, price, hours, costPerHour: null }
        const costPerHour = price / hours
        return { ...g, price, hours, costPerHour }
      })
      .filter(Boolean)
      .filter((g) => g.costPerHour !== null)
      .sort((a, b) => a.costPerHour - b.costPerHour)
  }, [games, prices])

  const zeroPlaytimeWithPrice = useMemo(() => {
    if (!games) return []
    return games.filter((g) => {
      const priceStr = prices[g.appid]
      const price = priceStr !== undefined && priceStr !== '' ? parseFloat(priceStr) : NaN
      return !isNaN(price) && price > 0 && (g.playtime_forever ?? 0) === 0
    })
  }, [games, prices])

  if (!games || games.length === 0) {
    return (
      <p className="text-[#acb2b8] text-sm text-center py-6">
        {t('cost.noGames')}
      </p>
    )
  }

  const allGames = [...games].sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
  const totalInputPages = Math.ceil(allGames.length / INPUT_PAGE_SIZE)
  const pagedGames = allGames.slice(inputPage * INPUT_PAGE_SIZE, (inputPage + 1) * INPUT_PAGE_SIZE)

  const pricedCount = games.filter((g) => {
    const v = prices[g.appid]
    return v !== undefined && v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) > 0
  }).length

  return (
    <div className="space-y-6">
      {/* ヘッダー説明 */}
      <div className="bg-[#1e3347] border border-[#2a475e] rounded-lg p-4 text-sm text-[#acb2b8]">
        <p className="mb-1">
          <span className="text-white font-semibold">{t('cost.formulaTitle')}</span>
          {t('cost.formula')}
        </p>
        <p>{t('cost.note')}</p>
        <p className="mt-2 text-xs text-[#7a9bb5]">{t('cost.apiNote')}</p>
      </div>

      {/* 価格入力セクション */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-[#f4b63d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('cost.inputTitle')}
            {pricedCount > 0 && (
              <span className="text-[#f4b63d] text-xs font-normal">
                {t('cost.inputCount', { n: pricedCount })}
              </span>
            )}
          </h3>
          <button
            onClick={() => setInputMode((v) => !v)}
            className="text-xs text-[#1a9fff] hover:text-[#66c0f4] transition-colors underline"
          >
            {inputMode ? t('cost.closeForm') : t('cost.openForm')}
          </button>
        </div>

        {inputMode && (
          <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_140px] gap-3 px-4 py-2 bg-[#1e3347] border-b border-[#2a475e]">
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider w-6 text-center">{t('cost.tableNum')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider">{t('cost.tableGame')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider text-right">{t('cost.tablePrice')}</span>
            </div>

            <ul>
              {pagedGames.map((g, idx) => {
                const url = iconUrl(g.appid, g.img_icon_url)
                const hours = Math.round((g.playtime_forever ?? 0) / 60 * 10) / 10
                const globalIdx = inputPage * INPUT_PAGE_SIZE + idx + 1

                return (
                  <li
                    key={g.appid}
                    className="grid grid-cols-[auto_1fr_140px] gap-3 items-center px-4 py-2.5 border-b border-[#2a475e]/50 last:border-0 hover:bg-[#1e3347]/50 transition-colors"
                  >
                    <span className="text-[#7a9bb5] text-xs w-6 text-center flex-shrink-0">
                      {globalIdx}
                    </span>

                    <div className="flex items-center gap-2 min-w-0">
                      {url ? (
                        <img src={url} alt="" className="w-6 h-6 rounded flex-shrink-0 object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-[#2a475e] flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[#c6d4df] text-xs truncate leading-tight" title={g.name}>
                          {g.name ?? `App ${g.appid}`}
                        </p>
                        <p className="text-[#7a9bb5] text-xs leading-tight">
                          {hours > 0 ? t('cost.playtimeDisplay', { hours: hours.toLocaleString(locale, { maximumFractionDigits: 1 }) }) : t('cost.noPlaytime')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[#acb2b8] text-xs flex-shrink-0">¥</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder={lang === 'en' ? 'N/A' : '未入力'}
                        value={prices[g.appid] ?? ''}
                        onChange={(e) => handlePriceChange(g.appid, e.target.value)}
                        className="w-20 bg-[#1b2838] border border-[#2a475e] rounded px-2 py-1 text-white text-xs text-right
                          focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30
                          placeholder-[#6a8a9e] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        aria-label={t('cost.inputAriaLabel', { name: g.name ?? g.appid })}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>

            {totalInputPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-[#1e3347] border-t border-[#2a475e]">
                <button
                  onClick={() => setInputPage((p) => Math.max(0, p - 1))}
                  disabled={inputPage === 0}
                  className="text-xs text-[#1a9fff] hover:text-[#66c0f4] disabled:text-[#4a6a7e] disabled:cursor-not-allowed transition-colors"
                >
                  {t('cost.prevPage')}
                </button>
                <span className="text-[#acb2b8] text-xs">
                  {t('cost.pageInfo', { current: inputPage + 1, total: totalInputPages, count: allGames.length })}
                </span>
                <button
                  onClick={() => setInputPage((p) => Math.min(totalInputPages - 1, p + 1))}
                  disabled={inputPage === totalInputPages - 1}
                  className="text-xs text-[#1a9fff] hover:text-[#66c0f4] disabled:text-[#4a6a7e] disabled:cursor-not-allowed transition-colors"
                >
                  {t('cost.nextPage')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* コスパランキング表示 */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          {t('cost.rankingTitle')}
          {ranking.length > 0 && (
            <span className="text-[#acb2b8] text-xs font-normal">
              {t('cost.rankingCount', { n: ranking.length })}
            </span>
          )}
        </h3>

        {ranking.length === 0 ? (
          <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg p-8 text-center">
            <svg className="w-10 h-10 text-[#2a475e] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[#acb2b8] text-sm">{t('cost.empty.message')}</p>
            <p className="text-[#7a9bb5] text-xs mt-1">{t('cost.empty.hint')}</p>
          </div>
        ) : (
          <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[36px_1fr_80px] sm:grid-cols-[40px_1fr_80px_80px_100px] gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-[#1e3347] border-b border-[#2a475e]">
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider text-center">{t('cost.rankTableRank')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider">{t('cost.rankTableGame')}</span>
              <span className="hidden sm:block text-[#acb2b8] text-xs uppercase tracking-wider text-right">{t('cost.rankTablePrice')}</span>
              <span className="hidden sm:block text-[#acb2b8] text-xs uppercase tracking-wider text-right">{t('cost.rankTableHours')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider text-right">{t('cost.rankTableCph')}</span>
            </div>

            <ul>
              {ranking.map((g, idx) => {
                const url = iconUrl(g.appid, g.img_icon_url)
                const rank = idx + 1
                const isTop3 = rank <= 3
                const rankColors = ['#f4b63d', '#acb2b8', '#cd7f32']

                return (
                  <li
                    key={g.appid}
                    className={`grid grid-cols-[36px_1fr_80px] sm:grid-cols-[40px_1fr_80px_80px_100px] gap-2 sm:gap-3 items-center px-3 sm:px-4 py-3 border-b border-[#2a475e]/50 last:border-0
                      ${rank === 1 ? 'bg-[#f4b63d]/5' : 'hover:bg-[#1e3347]/50'} transition-colors`}
                  >
                    <div className="flex justify-center">
                      {isTop3 ? (
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#1b2838]"
                          style={{ backgroundColor: rankColors[rank - 1] }}
                        >
                          {rank}
                        </span>
                      ) : (
                        <span className="text-[#7a9bb5] text-sm font-medium w-7 text-center">
                          {rank}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      {url ? (
                        <img src={url} alt="" className="w-7 h-7 rounded flex-shrink-0 object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-[#2a475e] flex-shrink-0" />
                      )}
                      <p className="text-[#c6d4df] text-xs sm:text-sm truncate" title={g.name}>
                        {g.name ?? `App ${g.appid}`}
                      </p>
                    </div>

                    <p className="hidden sm:block text-[#acb2b8] text-xs sm:text-sm text-right">
                      ¥{g.price.toLocaleString(locale)}
                    </p>

                    <p className="hidden sm:block text-[#acb2b8] text-xs sm:text-sm text-right">
                      {g.hours.toLocaleString(locale, { maximumFractionDigits: 1 })}h
                    </p>

                    <p
                      className="text-right font-bold text-sm sm:text-base"
                      style={{ color: rank === 1 ? '#f4b63d' : '#1a9fff' }}
                    >
                      ¥{g.costPerHour.toLocaleString(locale, { maximumFractionDigits: 1 })}
                      <span className="text-[#7a9bb5] text-xs font-normal">/h</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {zeroPlaytimeWithPrice.length > 0 && (
          <div className="mt-3 bg-[#1b2838] border border-[#f4b63d]/20 rounded-lg px-4 py-3">
            <p className="text-[#f4b63d] text-xs font-semibold mb-1">{t('cost.zeroPlaytimeTitle')}</p>
            <ul className="space-y-1">
              {zeroPlaytimeWithPrice.map((g) => (
                <li key={g.appid} className="text-[#acb2b8] text-xs flex items-center gap-2">
                  <span className="text-[#7a9bb5]">—</span>
                  {g.name ?? `App ${g.appid}`}
                  <span className="text-[#7a9bb5]">¥{parseFloat(prices[g.appid]).toLocaleString(locale)} / {t('cost.noPlaytime')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
