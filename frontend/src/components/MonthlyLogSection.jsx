/**
 * F-011 + F-014: 月別プレイ時間推移（手動ログ入力）
 * F-020: i18n対応
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const LINE_COLORS = [
  '#1a9fff', '#f4b63d', '#57cbde', '#e05252', '#5ba65b',
  '#c462e5', '#e57c52', '#52c4e5', '#e5c452', '#a452e5',
  '#52e578', '#e58252',
]

function loadLocalLogs(steamId) {
  try {
    const key = steamId ? `play_log_${steamId}` : 'play_log_guest'
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveLocalLogs(steamId, logs) {
  try {
    const key = steamId ? `play_log_${steamId}` : 'play_log_guest'
    localStorage.setItem(key, JSON.stringify(logs))
  } catch {
    // 無視
  }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg p-3 shadow-lg text-sm">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-[#acb2b8] flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate max-w-[160px]">{entry.dataKey}:</span>
          <span className="font-semibold" style={{ color: entry.color }}>
            {entry.value}h
          </span>
        </p>
      ))}
    </div>
  )
}

export default function MonthlyLogSection({ steamId }) {
  const { isLoggedIn, authFetch } = useAuth()
  const { t } = useLanguage()

  const [logs, setLogs] = useState([])
  const [serverSynced, setServerSynced] = useState(false)
  const syncedRef = useRef(false)

  const [formMonth, setFormMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [formGame, setFormGame] = useState('')
  const [formHours, setFormHours] = useState('')
  const [formError, setFormError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    syncedRef.current = false
    setServerSynced(false)

    if (isLoggedIn) {
      authFetch('/api/user/play-logs')
        .then((res) => res.ok ? res.json() : [])
        .then((serverLogs) => {
          if (serverLogs.length > 0) {
            setLogs(serverLogs.map((l) => ({
              id: l.id,
              month: l.month,
              game: l.game,
              hours: l.hours,
              client_id: l.client_id,
            })))
            setServerSynced(true)
          } else {
            const localLogs = loadLocalLogs(steamId)
            if (localLogs.length > 0) {
              setLogs(localLogs)
              syncToServer(localLogs)
            }
          }
        })
        .catch(() => {
          setLogs(loadLocalLogs(steamId))
        })
    } else {
      setLogs(loadLocalLogs(steamId))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, steamId])

  const syncToServer = useCallback(async (logsToSync) => {
    if (!isLoggedIn || syncedRef.current) return
    try {
      const res = await authFetch('/api/user/play-logs/sync', {
        method: 'POST',
        body: JSON.stringify({
          steam_id: steamId,
          logs: logsToSync.map((l) => ({
            client_id: l.id,
            month: l.month,
            game: l.game,
            hours: l.hours,
          })),
        }),
      })
      if (res.ok) {
        const saved = await res.json()
        setLogs(saved.map((l) => ({
          id: l.id,
          month: l.month,
          game: l.game,
          hours: l.hours,
          client_id: l.client_id,
        })))
        setServerSynced(true)
        syncedRef.current = true
      }
    } catch {
      // 同期エラーは無視
    }
  }, [isLoggedIn, authFetch, steamId])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setFormError('')

      if (!formMonth) { setFormError(t('monthly.error.noMonth')); return }
      if (!formGame.trim()) { setFormError(t('monthly.error.noGame')); return }
      const hours = parseFloat(formHours)
      if (isNaN(hours) || hours < 0) { setFormError(t('monthly.error.invalidHours')); return }

      const newEntry = {
        id: Date.now(),
        month: formMonth,
        game: formGame.trim(),
        hours,
      }

      if (isLoggedIn) {
        try {
          const res = await authFetch('/api/user/play-logs', {
            method: 'POST',
            body: JSON.stringify({
              client_id: newEntry.id,
              month: newEntry.month,
              game: newEntry.game,
              hours: newEntry.hours,
            }),
          })
          if (res.ok) {
            const saved = await res.json()
            setLogs((prev) => [...prev, {
              id: saved.id,
              month: saved.month,
              game: saved.game,
              hours: saved.hours,
              client_id: saved.client_id,
            }])
          } else {
            setFormError(t('monthly.error.saveFail'))
            return
          }
        } catch {
          setFormError(t('monthly.error.serverFail'))
          return
        }
      } else {
        setLogs((prev) => {
          const next = [...prev, newEntry]
          saveLocalLogs(steamId, next)
          return next
        })
      }

      setFormGame('')
      setFormHours('')
    },
    [formMonth, formGame, formHours, steamId, isLoggedIn, authFetch, t]
  )

  const handleDelete = useCallback(
    async (id) => {
      if (isLoggedIn) {
        try {
          await authFetch(`/api/user/play-logs/${id}`, { method: 'DELETE' })
          setLogs((prev) => prev.filter((entry) => entry.id !== id))
        } catch {
          // エラー無視
        }
      } else {
        setLogs((prev) => {
          const next = prev.filter((entry) => entry.id !== id)
          saveLocalLogs(steamId, next)
          return next
        })
      }
      setDeleteTarget(null)
    },
    [steamId, isLoggedIn, authFetch]
  )

  const { chartData, gameNames, gameColorMap } = useMemo(() => {
    if (logs.length === 0) {
      return { chartData: [], gameNames: [], gameColorMap: {} }
    }

    const monthSet = new Set(logs.map((e) => e.month))
    const months = [...monthSet].sort()

    const gameSet = new Set()
    logs.forEach((e) => gameSet.add(e.game))
    const games = [...gameSet]

    const colorMap = {}
    games.forEach((name, i) => {
      colorMap[name] = LINE_COLORS[i % LINE_COLORS.length]
    })

    const data = months.map((month) => {
      const row = { month }
      games.forEach((game) => {
        const total = logs
          .filter((e) => e.month === month && e.game === game)
          .reduce((sum, e) => sum + e.hours, 0)
        if (total > 0) {
          row[game] = Math.round(total * 10) / 10
        }
      })
      return row
    })

    return { chartData: data, gameNames: games, gameColorMap: colorMap }
  }, [logs])

  return (
    <div className="space-y-6">
      {/* Steam API 制限の説明 */}
      <div className="bg-[#1e3347] border border-[#2a475e] rounded-lg p-4 text-sm text-[#acb2b8]">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-[#57cbde] flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-white font-semibold mb-1">{t('monthly.apiTitle')}</p>
            <p>{t('monthly.apiNote')}</p>
            <p className="mt-1 text-xs text-[#7a9bb5]">
              {isLoggedIn
                ? t('monthly.saveNote.loggedIn')
                : t('monthly.saveNote.guest')}
              {isLoggedIn && serverSynced && (
                <span className="text-[#5ba65b] ml-1">{t('monthly.synced')}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 flex-wrap">
            <svg
              className="w-4 h-4 text-[#57cbde] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('monthly.addTitle')}
            {logs.length > 0 && (
              <span className="text-[#acb2b8] text-xs font-normal">
                {t('monthly.recordCount', { n: logs.length })}
              </span>
            )}
          </h3>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs text-[#1a9fff] hover:text-[#66c0f4] transition-colors underline self-start sm:self-auto flex-shrink-0"
          >
            {showForm ? t('monthly.closeForm') : t('monthly.openForm')}
          </button>
        </div>

        {showForm && (
          <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="log-month" className="block text-[#acb2b8] text-xs mb-1">
                    {t('monthly.month')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="log-month"
                    type="month"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    required
                    className="w-full bg-[#171a21] border border-[#2a475e] rounded-lg px-3 py-2 text-white text-sm
                      focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30"
                  />
                </div>
                <div>
                  <label htmlFor="log-game" className="block text-[#acb2b8] text-xs mb-1">
                    {t('monthly.game')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="log-game"
                    type="text"
                    value={formGame}
                    onChange={(e) => setFormGame(e.target.value)}
                    placeholder={t('monthly.gamePlaceholder')}
                    required
                    className="w-full bg-[#171a21] border border-[#2a475e] rounded-lg px-3 py-2 text-white text-sm
                      focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30
                      placeholder-[#6a8a9e]"
                  />
                </div>
                <div>
                  <label htmlFor="log-hours" className="block text-[#acb2b8] text-xs mb-1">
                    {t('monthly.hours')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="log-hours"
                    type="number"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    placeholder={t('monthly.hoursPlaceholder')}
                    min="0"
                    step="0.5"
                    required
                    className="w-full bg-[#171a21] border border-[#2a475e] rounded-lg px-3 py-2 text-white text-sm
                      focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30
                      placeholder-[#6a8a9e]
                      [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-red-400 text-xs" role="alert">{formError}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2a475e] hover:bg-[#3d6680] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {t('monthly.submit')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 折れ線グラフ */}
      {chartData.length > 0 ? (
        <div>
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#57cbde]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            {t('monthly.chartTitle')}
            <span className="text-[#acb2b8] text-xs font-normal">
              {t('monthly.chartMeta', { games: gameNames.length, months: chartData.length })}
            </span>
          </h3>

          <div className="w-full overflow-x-auto" style={{ minWidth: 0 }}>
            <div style={{ minWidth: Math.max(chartData.length * 80, 300), height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a475e" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#acb2b8', fontSize: 10 }}
                    axisLine={{ stroke: '#2a475e' }}
                    tickLine={{ stroke: '#2a475e' }}
                    minTickGap={20}
                  />
                  <YAxis
                    unit="h"
                    tick={{ fill: '#acb2b8', fontSize: 12 }}
                    axisLine={{ stroke: '#2a475e' }}
                    tickLine={{ stroke: '#2a475e' }}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ color: '#acb2b8', fontSize: 12, paddingTop: 12 }}
                  />
                  {gameNames.map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={gameColorMap[name]}
                      strokeWidth={2}
                      dot={{ fill: gameColorMap[name], r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg p-8 text-center">
          <svg
            className="w-10 h-10 text-[#2a475e] mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="text-[#acb2b8] text-sm">{t('monthly.empty.message')}</p>
          <p className="text-[#7a9bb5] text-xs mt-1">{t('monthly.empty.hint')}</p>
        </div>
      )}

      {/* 入力済みログ一覧 */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#acb2b8]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {t('monthly.listTitle')}
          </h3>

          <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 px-4 py-2 bg-[#1e3347] border-b border-[#2a475e]">
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider">{t('monthly.colMonth')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider">{t('monthly.colGame')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider text-right">{t('monthly.colHours')}</span>
              <span className="text-[#acb2b8] text-xs uppercase tracking-wider text-center">{t('monthly.colDelete')}</span>
            </div>

            <ul className="max-h-60 overflow-y-auto">
              {[...logs].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="grid grid-cols-[1fr_1fr_80px_40px] gap-2 items-center px-4 py-2.5 border-b border-[#2a475e]/50 last:border-0 hover:bg-[#1e3347]/50 transition-colors"
                >
                  <span className="text-[#c6d4df] text-xs">{entry.month}</span>
                  <span
                    className="text-[#c6d4df] text-xs truncate"
                    title={entry.game}
                    style={{ color: gameColorMap[entry.game] ?? '#c6d4df' }}
                  >
                    {entry.game}
                  </span>
                  <span className="text-[#1a9fff] text-xs font-semibold text-right">
                    {entry.hours}h
                  </span>
                  <div className="flex justify-center">
                    {deleteTarget === entry.id ? (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-400 hover:text-red-300 text-xs transition-colors px-1"
                        aria-label={t('monthly.deleteConfirmAriaLabel')}
                      >
                        {t('monthly.deleteConfirm')}
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(entry.id)}
                        className="text-[#4a6a7e] hover:text-red-400 transition-colors"
                        aria-label={t('monthly.deleteAriaLabel', { game: entry.game, month: entry.month })}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {!isLoggedIn && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => {
                  if (window.confirm(t('monthly.deleteAllConfirm'))) {
                    setLogs([])
                    saveLocalLogs(steamId, [])
                  }
                }}
                className="text-xs text-[#4a6a7e] hover:text-red-400 transition-colors"
              >
                {t('monthly.deleteAllButton')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
