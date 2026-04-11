/**
 * F-002: プレイ時間ランキング（TOP20 横棒グラフ）
 * F-019: 降順ソート保証
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
function CustomTooltip({ active, payload, lang }) {
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
      <p className="text-[#1a9fff] text-sm font-bold">
        {hours.toLocaleString(locale, { maximumFractionDigits: 1 })} {lang === 'en' ? 'h' : '時間'}
      </p>
    </div>
  )
}

export default function TopGamesChart({ games }) {
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
    // 初期値
    setContainerWidth(containerRef.current.offsetWidth || 400)
    return () => observer.disconnect()
  }, [])

  const isMobile = containerWidth < 480

  if (!games || games.length === 0) {
    return (
      <p className="text-[#acb2b8] text-sm text-center py-6">
        {t('topGames.noData')}
      </p>
    )
  }

  // playtime_forever（分） → 時間
  // 明示的な降順ソート → reverse() で横棒グラフの上側が1位になる配置
  const data = games
    .slice(0, 20)
    .map((g) => ({
      name: g.name ?? `App ${g.appid}`,
      hours: Math.round((g.playtime_forever / 60) * 10) / 10,
      appid: g.appid,
      img_icon_url: g.img_icon_url,
    }))
    // 降順ソート（プレイ時間多い順、同一時間はゲーム名アルファベット順）
    .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name))
    // reverse: 横棒グラフでは配列末尾が上に来るため
    .reverse()

  const maxHours = Math.max(...data.map((d) => d.hours))

  // モバイルではマージンを縮小
  const leftMargin = isMobile ? 82 : 130
  const rightMargin = isMobile ? 44 : 56

  return (
    <div
      ref={containerRef}
      style={{ minWidth: 0 }}
      aria-label={t('topGames.ariaLabel', { n: data.length })}
    >
      {/* スクリーンリーダー向けの代替テキスト */}
      <ul className="sr-only">
        {[...data].reverse().map((d, i) => (
          <li key={d.appid}>
            {t('topGames.srItem', { rank: i + 1, name: d.name, hours: d.hours })}
          </li>
        ))}
      </ul>

      <ResponsiveContainer width="100%" height={Math.max(320, data.length * 32)}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: rightMargin, bottom: 4, left: leftMargin }}
          barSize={isMobile ? 14 : 18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.ceil(maxHours * 1.05)]}
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
          <Tooltip content={<CustomTooltip lang={lang} />} cursor={{ fill: '#1e3347' }} />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.appid}
                fill={index === data.length - 1 ? '#f4b63d' : '#1a9fff'}
              />
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
