/**
 * F-003: 直近2週間のプレイ比較グラフ（横棒グラフ）
 * F-020: i18n対応
 */
import { useRef, useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { useLanguage } from '../contexts/LanguageContext'

/** Steam CDN のアイコン URL を生成する */
function iconUrl(appid, imgIconUrl) {
  if (!appid || !imgIconUrl) return null
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${imgIconUrl}.jpg`
}

/** カスタム Y 軸ティック（アイコン + ゲーム名） */
function GameTick({ x, y, payload, games, isMobile }) {
  const game = games.find((g) => g.name === payload.value)
  const url = game ? iconUrl(game.appid, game.img_icon_url) : null

  const maxLen = isMobile ? 10 : 18
  const label = payload.value.length > maxLen
    ? payload.value.slice(0, maxLen - 1) + '…'
    : payload.value

  const iconOffset = isMobile ? -80 : -130
  const textOffset = isMobile ? (url ? -56 : -8) : (url ? -105 : -8)
  const iconSize = isMobile ? 16 : 20

  return (
    <g transform={`translate(${x},${y})`}>
      {url && (
        <image
          href={url}
          x={iconOffset}
          y={-iconSize / 2}
          width={iconSize}
          height={iconSize}
        />
      )}
      <text
        x={textOffset}
        y={0}
        dy={4}
        textAnchor="start"
        fill="#c6d4df"
        fontSize={isMobile ? 10 : 11}
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {label}
      </text>
    </g>
  )
}

/** カスタムツールチップ */
function CustomTooltip({ active, payload, lang, t }) {
  if (!active || !payload || !payload.length) return null
  const { name, hours, appid, img_icon_url } = payload[0].payload
  const url = iconUrl(appid, img_icon_url)
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  return (
    <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg p-3 shadow-xl max-w-[220px]">
      <div className="flex items-center gap-2 mb-1">
        {url && <img src={url} alt="" className="w-6 h-6 rounded flex-shrink-0" />}
        <span className="text-white text-xs font-medium leading-snug">{name}</span>
      </div>
      <p className="text-[#4caf7d] text-sm font-bold">
        {hours.toLocaleString(locale, { maximumFractionDigits: 1 })} {t('recentGames.hoursLabel')}
      </p>
    </div>
  )
}

export default function RecentGamesChart({ games }) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(400)
  const { lang, t } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth || 400)
    return () => observer.disconnect()
  }, [])

  const isMobile = containerWidth < 480

  // playtime_2weeks > 0 のゲームのみフィルタ
  const filtered = (games || []).filter((g) => (g.playtime_2weeks ?? 0) > 0)

  if (filtered.length === 0) {
    return (
      <p className="text-[#acb2b8] text-sm text-center py-6">
        {t('recentGames.noData')}
      </p>
    )
  }

  // 降順ソート後に逆順（グラフ上側が1位になるよう）
  const data = [...filtered]
    .sort((a, b) => b.playtime_2weeks - a.playtime_2weeks)
    .map((g) => ({
      name: g.name ?? `App ${g.appid}`,
      hours: Math.round((g.playtime_2weeks / 60) * 10) / 10,
      appid: g.appid,
      img_icon_url: g.img_icon_url,
    }))
    .reverse()

  const maxHours = Math.max(...data.map((d) => d.hours))
  const leftMargin = isMobile ? 82 : 130
  const rightMargin = isMobile ? 44 : 56

  return (
    <div ref={containerRef} style={{ minWidth: 0 }} aria-label={t('recentGames.ariaLabel')}>
      {/* スクリーンリーダー向け代替テキスト */}
      <ul className="sr-only">
        {[...data].reverse().map((d, i) => (
          <li key={d.appid}>
            {t('recentGames.srItem', { rank: i + 1, name: d.name, hours: d.hours })}
          </li>
        ))}
      </ul>

      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: rightMargin, bottom: 4, left: leftMargin }}
          barSize={isMobile ? 16 : 20}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxHours * 1.1) || 1]}
            tick={{ fill: '#acb2b8', fontSize: isMobile ? 10 : 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}h`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={leftMargin}
            tick={(props) => <GameTick {...props} games={data} isMobile={isMobile} />}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip lang={lang} t={t} />} cursor={{ fill: '#1e3347' }} />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.appid} fill="#4caf7d" />
            ))}
            <LabelList
              dataKey="hours"
              position="right"
              style={{ fill: '#acb2b8', fontSize: isMobile ? 10 : 11 }}
              formatter={(v) =>
                `${v.toLocaleString(locale, { maximumFractionDigits: 1 })}h`
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
