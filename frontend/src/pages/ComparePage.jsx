import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { useLanguage } from '../contexts/LanguageContext'
import { apiUrl } from '../lib/api'

/**
 * 友人比較モード (F-012)
 * F-020: i18n対応
 *
 * - 2〜4人の Steam ID を入力してデータを一括取得
 * - 各ユーザーのカードを横並びで表示
 * - 共通ゲームをハイライト（金色の枠）で表示
 * - プロフィール非公開のユーザーはエラーカードとして表示
 */
export default function ComparePage() {
  const { t } = useLanguage()
  // 入力フィールドの数（2〜4）
  const [inputCount, setInputCount] = useState(2)
  const [inputs, setInputs] = useState(['', '', '', ''])
  const [results, setResults] = useState(null)  // null | array of {steamId, data, error}
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(null)

  // 入力フィールドの値を更新
  const handleInputChange = useCallback((index, value) => {
    setInputs(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  // 比較実行
  const handleCompare = useCallback(async (e) => {
    e.preventDefault()
    setFormError(null)

    const activeInputs = inputs.slice(0, inputCount).map(v => v.trim()).filter(Boolean)
    if (activeInputs.length < 2) {
      setFormError(t('compare.error.minPlayers'))
      return
    }

    setLoading(true)
    setResults(null)

    // 各 Steam ID を並行して取得
    const fetches = activeInputs.map(async (steamInput) => {
      try {
        const encoded = encodeURIComponent(steamInput)
        const res = await fetch(apiUrl(`/api/steam/stats/${encoded}`))

        if (!res.ok) {
          let detail = null
          try {
            const json = await res.json()
            detail = json.detail
          } catch {
            // ignore
          }

          if (res.status === 403 && detail && detail.error_code === 'PROFILE_PRIVATE') {
            return {
              steamInput,
              data: null,
              error: { type: 'PROFILE_PRIVATE', detail },
            }
          }
          return {
            steamInput,
            data: null,
            error: {
              type: 'API_ERROR',
              message: (typeof detail === 'string' ? detail : null) || t('compare.apiError'),
            },
          }
        }

        const json = await res.json()
        return { steamInput, data: json, error: null }
      } catch {
        return {
          steamInput,
          data: null,
          error: { type: 'NETWORK_ERROR', message: t('compare.fetchError') },
        }
      }
    })

    const settled = await Promise.all(fetches)
    setResults(settled)
    setLoading(false)
  }, [inputs, inputCount, t])

  // 共通ゲームの AppID セットを計算
  const commonAppIds = computeCommonGames(results)

  return (
    <main className="flex-1 px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">

        {/* ナビゲーション */}
        <nav className="mb-6" aria-label={t('compare.breadcrumb')}>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[#1a9fff] hover:text-[#66c0f4] text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('compare.backToTop')}
          </Link>
        </nav>

        {/* ページタイトル */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <svg className="w-7 h-7 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('compare.title')}
          </h1>
          <p className="text-[#acb2b8] text-sm">
            {t('compare.desc')}
          </p>
        </div>

        {/* 入力フォーム */}
        <form
          onSubmit={handleCompare}
          className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-base">{t('compare.formTitle')}</h2>
            <div className="flex items-center gap-2 text-sm text-[#acb2b8]">
              <span>{t('compare.playerCount')}</span>
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInputCount(n)}
                  className={`w-8 h-8 rounded font-semibold transition-colors ${
                    inputCount === n
                      ? 'bg-[#1a9fff] text-white'
                      : 'bg-[#2a475e] text-[#acb2b8] hover:bg-[#316282]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {Array.from({ length: inputCount }).map((_, i) => (
              <div key={i}>
                <label className="block text-xs text-[#acb2b8] mb-1">
                  {t('compare.playerLabel', { n: i + 1 })}
                </label>
                <input
                  type="text"
                  value={inputs[i]}
                  onChange={e => handleInputChange(i, e.target.value)}
                  placeholder={t('compare.inputPlaceholder')}
                  className="w-full bg-[#1b2838] border border-[#2a475e] rounded px-3 py-2.5 text-[#c6d4df] text-sm placeholder-[#6a8a9e] focus:outline-none focus:border-[#1a9fff] transition-colors"
                />
              </div>
            ))}
          </div>

          {formError && (
            <p className="text-[#c94f4f] text-sm mb-3">{formError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-[#1a9fff] hover:bg-[#66c0f4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded text-sm transition-colors"
          >
            {loading ? t('compare.submitting') : t('compare.submit')}
          </button>
        </form>

        {/* ローディング */}
        {loading && (
          <LoadingSpinner message={t('compare.loading')} />
        )}

        {/* 比較結果 */}
        {!loading && results && (
          <div className="space-y-8">

            {/* プレイヤーカード（横並び） */}
            <section>
              <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {t('compare.resultsTitle')}
              </h2>
              <div className={`grid gap-4 ${
                results.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : results.length === 3
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
              }`}>
                {results.map((result, i) => (
                  <PlayerCard key={i} result={result} index={i} t={t} />
                ))}
              </div>
            </section>

            {/* 共通ゲームセクション */}
            {commonAppIds.size > 0 && (
              <CommonGamesSection results={results} commonAppIds={commonAppIds} t={t} />
            )}

            {/* 全員が非公開などで共通ゲームがゼロの場合 */}
            {commonAppIds.size === 0 && results.some(r => r.data) && (
              <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5">
                <p className="text-[#acb2b8] text-sm text-center">
                  {t('compare.noCommon')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// PlayerCard
// ---------------------------------------------------------------------------

function PlayerCard({ result, index, t }) {
  const colors = ['#1a9fff', '#57cbde', '#f4b63d', '#a358d4']
  const color = colors[index % colors.length]

  // エラーカード
  if (result.error) {
    const isPrivate = result.error.type === 'PROFILE_PRIVATE'
    return (
      <div className="bg-[#1e2a35] border border-[#c94f4f] rounded-xl p-4 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#c94f4f]/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#c94f4f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isPrivate
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            }
          </svg>
        </div>
        <div>
          <p className="text-[#c94f4f] font-semibold text-sm mb-1">
            {isPrivate ? t('compare.error.private') : t('compare.error.fetch')}
          </p>
          <p className="text-[#acb2b8] text-xs break-all">{result.steamInput}</p>
          {isPrivate && (
            <p className="text-[#acb2b8] text-xs mt-2">
              {t('compare.error.privateNote')}
            </p>
          )}
          {!isPrivate && result.error.message && (
            <p className="text-[#acb2b8] text-xs mt-2">{result.error.message}</p>
          )}
        </div>
      </div>
    )
  }

  const { data } = result
  const player = data?.player
  const summary = data?.summary
  const topGame = summary?.top_game

  return (
    <div
      className="bg-[#1e2a35] rounded-xl p-4 flex flex-col gap-3"
      style={{ border: `1px solid ${color}40` }}
    >
      {/* アバター + 名前 */}
      <div className="flex flex-col items-center text-center gap-2">
        {player?.avatarfull ? (
          <img
            src={player.avatarfull}
            alt={`${player.personaname}`}
            className="w-16 h-16 rounded-full object-cover"
            style={{ borderWidth: 3, borderStyle: 'solid', borderColor: color }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full bg-[#2a475e] flex items-center justify-center"
            style={{ borderWidth: 3, borderStyle: 'solid', borderColor: color }}
          >
            <svg className="w-8 h-8 text-[#4a6a7e]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        <div>
          <p className="text-white font-bold text-sm leading-tight break-all">
            {player?.personaname ?? result.steamInput}
          </p>
          {player?.profileurl && (
            <a
              href={player.profileurl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors mt-0.5 inline-block"
              style={{ color }}
            >
              {t('compare.profileLink')}
            </a>
          )}
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-2">
        <StatMini
          label={t('compare.totalGames')}
          value={`${(summary?.total_games ?? 0).toLocaleString()}${t('compare.totalGamesUnit')}`}
        />
        <StatMini
          label={t('compare.totalHours')}
          value={`${(summary?.total_playtime_hours ?? 0).toLocaleString()}${t('compare.totalHoursUnit')}`}
        />
      </div>

      {/* 最多プレイゲーム */}
      {topGame && (
        <div className="bg-[#1b2838] rounded-lg p-3">
          <p className="text-[#acb2b8] text-xs mb-1">{t('compare.topGame')}</p>
          <p className="text-white text-sm font-semibold leading-tight truncate" title={topGame.name}>
            {topGame.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color }}>
            {t('compare.topGameHours', { hours: Math.round((topGame.playtime_forever ?? 0) / 60).toLocaleString() })}
          </p>
        </div>
      )}
    </div>
  )
}

function StatMini({ label, value }) {
  return (
    <div className="bg-[#1b2838] rounded-lg p-2.5 text-center">
      <p className="text-[#acb2b8] text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-sm">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CommonGamesSection
// ---------------------------------------------------------------------------

function CommonGamesSection({ results, commonAppIds, t }) {
  // 成功したデータのみ対象
  const successResults = results.filter(r => r.data)

  // 共通ゲームのデータを収集（最初の成功ユーザーのゲームリストから取得）
  const allGames = successResults[0]?.data?.top_games ?? []
  const commonGames = allGames
    .filter(g => commonAppIds.has(g.appid))
    .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))

  return (
    <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
      <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-[#f4b63d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        {t('compare.commonTitle')}
        <span className="text-[#acb2b8] font-normal text-sm ml-1">{t('compare.commonCount', { n: commonGames.length })}</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {commonGames.map(game => (
          <CommonGameCard key={game.appid} game={game} results={successResults} />
        ))}
      </div>
    </section>
  )
}

function CommonGameCard({ game, results }) {
  const iconUrl = game.img_icon_url
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : null

  return (
    <div className="bg-[#1e2a35] border-2 border-[#f4b63d]/60 rounded-lg p-3 flex items-start gap-3">
      {/* ゲームアイコン */}
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-10 h-10 rounded bg-[#2a475e] flex-shrink-0 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#4a6a7e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
          </svg>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-semibold leading-tight truncate" title={game.name}>
          {game.name ?? `App ${game.appid}`}
        </p>
        {/* 各プレイヤーのプレイ時間 */}
        <div className="mt-1 space-y-0.5">
          {results.map((r, i) => {
            const playerGame = r.data?.top_games?.find(g => g.appid === game.appid)
              ?? r.data?.summary?.top_game?.appid === game.appid ? r.data?.summary?.top_game : null
            const hours = playerGame ? Math.round((playerGame.playtime_forever ?? 0) / 60) : null
            const colors = ['#1a9fff', '#57cbde', '#f4b63d', '#a358d4']
            const color = colors[i % colors.length]
            const name = r.data?.player?.personaname ?? r.steamInput
            return (
              <p key={i} className="text-xs" style={{ color }}>
                {name}: {hours !== null ? `${hours.toLocaleString()} h` : '—'}
              </p>
            )
          })}
        </div>
      </div>

      {/* 金色バッジ */}
      <div className="flex-shrink-0">
        <svg className="w-4 h-4 text-[#f4b63d]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ユーティリティ: 共通ゲームの AppID セットを計算
// ---------------------------------------------------------------------------

function computeCommonGames(results) {
  if (!results) return new Set()

  const successResults = results.filter(r => r.data)
  if (successResults.length < 2) return new Set()

  // 各ユーザーの appid セットを作成
  const gameSets = successResults.map(r => {
    const games = r.data?.top_games ?? []
    return new Set(games.map(g => g.appid))
  })

  // 全員の intersection
  const [first, ...rest] = gameSets
  const intersection = new Set(
    [...first].filter(appid => rest.every(s => s.has(appid)))
  )
  return intersection
}
