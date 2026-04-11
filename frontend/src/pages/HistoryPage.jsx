/**
 * 統計データ履歴ページ（/history ルート）
 * - ログインユーザーの過去の取得データ履歴を一覧表示
 * - 未ログイン時はログインページへリダイレクト
 * F-020: i18n対応
 */
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

function formatDate(isoString, locale) {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHours(hours) {
  if (hours == null) return '-'
  return `${Math.round(hours).toLocaleString()}h`
}

export default function HistoryPage() {
  const { isLoggedIn, loading: authLoading, authFetch, user } = useAuth()
  const { t, lang } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'
  const navigate = useNavigate()
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 未ログイン時はログインページへ
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/auth?redirect=/history', { replace: true })
    }
  }, [isLoggedIn, authLoading, navigate])

  // 履歴データを取得
  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    authFetch('/api/user/stats-history')
      .then((res) => {
        if (!res.ok) throw new Error(t('history.fetching'))
        return res.json()
      })
      .then((data) => setHistories(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isLoggedIn, authFetch, t])

  if (authLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-[#acb2b8] text-sm">{t('history.loading')}</div>
      </main>
    )
  }

  if (!isLoggedIn) return null

  return (
    <main className="flex-1 px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* ナビゲーション */}
        <nav className="mb-6" aria-label="パンくずリスト">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[#1a9fff] hover:text-[#66c0f4] text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('history.backToTop')}
          </Link>
        </nav>

        {/* ページヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('history.title')}
          </h1>
          {user && (
            <p className="text-[#acb2b8] text-sm mt-1">
              {t('history.userEmail', { email: user.email })}
            </p>
          )}
        </div>

        {/* ローディング */}
        {loading && (
          <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-[#1a9fff] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[#acb2b8] text-sm">{t('history.fetching')}</p>
          </div>
        )}

        {/* エラー */}
        {!loading && error && (
          <div className="bg-red-900/20 border border-red-500/40 rounded-xl p-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs text-[#1a9fff] hover:text-[#66c0f4] transition-colors underline"
            >
              {t('history.error.reload')}
            </button>
          </div>
        )}

        {/* 履歴一覧 */}
        {!loading && !error && (
          <>
            {histories.length === 0 ? (
              <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-12 text-center">
                <svg className="w-12 h-12 text-[#2a475e] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-[#acb2b8] text-sm mb-2">{t('history.empty.message')}</p>
                <p className="text-[#7a9bb5] text-xs mb-4">
                  {t('history.empty.hint')}
                </p>
                <Link
                  to="/"
                  className="inline-block bg-[#1a9fff] hover:bg-[#0e87e0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  {t('history.empty.link')}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[#acb2b8] text-xs mb-4">
                  {t('history.count', { n: histories.length })}
                </p>
                {histories.map((h) => (
                  <div
                    key={h.id}
                    className="bg-[#171a21] border border-[#2a475e] rounded-xl p-4 sm:p-5 hover:border-[#1a9fff]/40 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* アバター */}
                      {h.avatar_url ? (
                        <img
                          src={h.avatar_url}
                          alt={h.player_name || t('history.unknown')}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#2a475e] flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-[#4a6a7e]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                          </svg>
                        </div>
                      )}

                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <div>
                            <p className="text-white font-semibold text-sm truncate">
                              {h.player_name || t('history.unknown')}
                            </p>
                            <p className="text-[#7a9bb5] text-xs">
                              {t('history.steamId')} {h.steam_id}
                            </p>
                          </div>
                          <p className="text-[#7a9bb5] text-xs flex-shrink-0">
                            {formatDate(h.fetched_at, locale)}
                          </p>
                        </div>

                        {/* 統計グリッド */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                          <div className="bg-[#1b2838] rounded-lg px-3 py-2">
                            <p className="text-[#7a9bb5] text-xs">{t('history.totalGames')}</p>
                            <p className="text-white font-semibold text-sm">
                              {h.total_games != null ? `${h.total_games}${t('history.gamesUnit')}` : '-'}
                            </p>
                          </div>
                          <div className="bg-[#1b2838] rounded-lg px-3 py-2">
                            <p className="text-[#7a9bb5] text-xs">{t('history.totalHours')}</p>
                            <p className="text-[#1a9fff] font-semibold text-sm">
                              {formatHours(h.total_playtime_hours)}
                            </p>
                          </div>
                          {h.top_game_name && (
                            <div className="bg-[#1b2838] rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
                              <p className="text-[#7a9bb5] text-xs">{t('history.topGame')}</p>
                              <p className="text-[#f4b63d] font-semibold text-xs truncate" title={h.top_game_name}>
                                {h.top_game_name}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 再分析リンク */}
                        <div className="mt-3">
                          <Link
                            to={`/result/${encodeURIComponent(h.steam_id)}`}
                            className="text-xs text-[#1a9fff] hover:text-[#66c0f4] transition-colors"
                          >
                            {t('history.reanalyze')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
