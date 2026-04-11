import { useState, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * ジャンル別プレイ時間ドーナツチャート + ゲーム一覧（F-010）
 * F-020: i18n対応
 */

const GENRE_COLORS = [
  '#1a9fff', '#f4b63d', '#57cbde', '#e05252', '#5ba65b',
  '#c462e5', '#e57c52', '#52c4e5', '#e5c452', '#a452e5',
  '#52e578', '#e58252',
]

function getGameIconUrl(appid, imgIconUrl) {
  if (!imgIconUrl) return null
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${imgIconUrl}.jpg`
}

function CustomTooltip({ active, payload, lang, t }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'
  return (
    <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg p-3 shadow-lg text-sm">
      <p className="text-white font-bold mb-1">{d.genre}</p>
      <p className="text-[#acb2b8]">
        {t('genre.tooltip.hours')} <span className="text-[#1a9fff] font-semibold">{d.total_playtime_hours.toLocaleString(locale)}{t('genre.tooltip.hoursUnit')}</span>
      </p>
      <p className="text-[#acb2b8]">
        {t('genre.tooltip.count')} <span className="text-white">{d.game_count}{t('genre.tooltip.countUnit')}</span>
      </p>
    </div>
  )
}

function CustomLegend({ payload, onSelect, selectedGenre }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3">
      {payload.map((entry) => (
        <button
          key={entry.value}
          onClick={() => onSelect(entry.value)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
            selectedGenre === entry.value
              ? 'bg-[#2a475e] text-white ring-1 ring-[#1a9fff]'
              : 'text-[#acb2b8] hover:text-white hover:bg-[#1b2838]'
          }`}
          aria-pressed={selectedGenre === entry.value}
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          {entry.value}
        </button>
      ))}
    </div>
  )
}

export default function GenreChart({ genreData }) {
  const [selectedGenre, setSelectedGenre] = useState(null)
  const { lang, t } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  const handleSliceClick = useCallback((data) => {
    if (!data) return
    setSelectedGenre((prev) => (prev === data.genre ? null : data.genre))
  }, [])

  const handleLegendSelect = useCallback((genre) => {
    setSelectedGenre((prev) => (prev === genre ? null : genre))
  }, [])

  if (!genreData || !genreData.genres || genreData.genres.length === 0) {
    return (
      <div className="text-[#acb2b8] text-sm text-center py-8">
        {t('genre.noData')}
      </div>
    )
  }

  const { genres } = genreData

  const chartData = genres.map((g, i) => ({
    ...g,
    name: g.genre,
    value: g.total_playtime_hours,
    color: GENRE_COLORS[i % GENRE_COLORS.length],
  }))

  const selectedGenreData = selectedGenre
    ? genres.find((g) => g.genre === selectedGenre)
    : null

  return (
    <div>
      {/* ドーナツチャート */}
      <div className="w-full" style={{ height: 320, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="70%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              onClick={handleSliceClick}
              style={{ cursor: 'pointer' }}
              aria-label={t('genre.ariaLabel')}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={
                    selectedGenre === null || selectedGenre === entry.genre ? 1 : 0.35
                  }
                  stroke={selectedGenre === entry.genre ? '#ffffff' : 'transparent'}
                  strokeWidth={selectedGenre === entry.genre ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip lang={lang} t={t} />} />
            <Legend
              content={
                <CustomLegend
                  payload={chartData.map((d) => ({ value: d.genre, color: d.color }))}
                  onSelect={handleLegendSelect}
                  selectedGenre={selectedGenre}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ジャンル選択の案内 */}
      {!selectedGenre && (
        <p className="text-[#acb2b8] text-xs text-center mt-2">
          {t('genre.clickHint')}
        </p>
      )}

      {/* 選択中ジャンルのゲーム一覧 */}
      {selectedGenre && selectedGenreData && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    chartData.find((d) => d.genre === selectedGenre)?.color ?? '#1a9fff',
                }}
              />
              {selectedGenre}
              <span className="text-[#acb2b8] font-normal">
                ({selectedGenreData.game_count}{t('genre.tooltip.countUnit')} / {selectedGenreData.total_playtime_hours.toLocaleString(locale)}{t('genre.tooltip.hoursUnit')})
              </span>
            </h3>
            <button
              onClick={() => setSelectedGenre(null)}
              className="text-[#acb2b8] hover:text-white text-xs px-2 py-1 rounded hover:bg-[#2a475e] transition-colors"
              aria-label={t('genre.closeAriaLabel')}
            >
              {t('genre.close')}
            </button>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {selectedGenreData.games.map((game) => {
              const iconUrl = getGameIconUrl(game.appid, game.img_icon_url)
              return (
                <div
                  key={game.appid}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1b2838] hover:bg-[#243447] transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-[#0e1117] flex items-center justify-center">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <svg
                      className={`w-4 h-4 text-[#4a5568] ${iconUrl ? 'hidden' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  <span className="flex-1 text-sm text-[#c6d4df] truncate" title={game.name}>
                    {game.name}
                  </span>

                  <span className="flex-shrink-0 text-sm font-semibold text-[#1a9fff]">
                    {game.playtime_hours.toLocaleString(locale)}{t('genre.tooltip.hoursUnit')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 集計サマリー */}
      <div className="mt-4 pt-4 border-t border-[#2a475e] grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[#acb2b8] text-xs">{t('genre.summary.genreCount')}</p>
          <p className="text-white font-bold text-lg">{genres.length}</p>
        </div>
        <div>
          <p className="text-[#acb2b8] text-xs">{t('genre.summary.gameCount')}</p>
          <p className="text-white font-bold text-lg">{genreData.total_games_classified}</p>
        </div>
        <div>
          <p className="text-[#acb2b8] text-xs">{t('genre.summary.topGenre')}</p>
          <p className="text-[#1a9fff] font-bold text-sm truncate">{genres[0]?.genre ?? '-'}</p>
        </div>
      </div>
    </div>
  )
}
