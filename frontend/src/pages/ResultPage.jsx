import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSteamStats } from '../hooks/useSteamStats'
import { useOgpMeta } from '../hooks/useOgpMeta'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import SummaryCards from '../components/SummaryCards'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorDisplay from '../components/ErrorDisplay'
import CacheInfo from '../components/CacheInfo'
import SteamIdForm from '../components/SteamIdForm'
import TopGamesChart from '../components/TopGamesChart'
import RecentGamesChart from '../components/RecentGamesChart'
import ShareButton from '../components/ShareButton'
import CostRankingSection from '../components/CostRankingSection'
import GenreSection from '../components/GenreSection'
import MonthlyLogSection from '../components/MonthlyLogSection'
import BadgeSection from '../components/BadgeSection'
import AnnualReportSection from '../components/AnnualReportSection'

/**
 * 結果ページ (F-001, F-002, F-003, F-004, F-006, F-007, F-008, F-014)
 * F-020: i18n対応
 */
export default function ResultPage() {
  const { steamInput } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, fetchStats, refresh } = useSteamStats()
  const { isLoggedIn, authFetch } = useAuth()
  const { t } = useLanguage()
  const [refreshing, setRefreshing] = useState(false)
  const [savedToServer, setSavedToServer] = useState(false)
  const savedRefKey = useRef(null)

  useOgpMeta({
    steamId: data?.steamid,
    player: data?.player,
    summary: data?.summary,
  })

  const decodedInput = decodeURIComponent(steamInput || '')

  useEffect(() => {
    if (decodedInput) {
      fetchStats(decodedInput)
      setSavedToServer(false)
      savedRefKey.current = null
    }
  }, [decodedInput, fetchStats])

  useEffect(() => {
    if (!isLoggedIn || !data || loading || error) return
    const saveKey = `${data.steamid}-${data.cache_info?.cached_at || Date.now()}`
    if (savedRefKey.current === saveKey) return
    savedRefKey.current = saveKey

    async function saveToServer() {
      try {
        const summary = data.summary || {}
        const player = data.player || {}
        const payload = {
          steam_id: data.steamid,
          player_name: player.personaname || null,
          avatar_url: player.avatarmedium || player.avatar || null,
          total_games: summary.total_games ?? null,
          total_playtime_hours: summary.total_playtime_hours ?? null,
          top_game_name: summary.top_game?.name ?? null,
          top_game_hours: summary.top_game?.hours ?? null,
          raw_data: null,
        }
        const res = await authFetch('/api/user/stats-history', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setSavedToServer(true)
        }
      } catch {
        // 保存エラーは無視
      }
    }

    saveToServer()
  }, [isLoggedIn, data, loading, error, authFetch])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    setSavedToServer(false)
    savedRefKey.current = null
    await refresh(decodedInput)
    setRefreshing(false)
  }, [refresh, decodedInput])

  const handleRetry = useCallback(() => {
    fetchStats(decodedInput)
  }, [fetchStats, decodedInput])

  function handleNewSearch(newInput) {
    navigate(`/result/${encodeURIComponent(newInput)}`)
  }

  return (
    <main className="flex-1 px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">

        <nav className="mb-6" aria-label="パンくずリスト">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[#1a9fff] hover:text-[#66c0f4] text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('result.backToTop')}
          </Link>
        </nav>

        {loading && !data && (
          <LoadingSpinner message={t('result.loading')} />
        )}

        {!loading && error && (
          <ErrorDisplay error={error} onRetry={handleRetry} />
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            <CacheInfo
              cacheInfo={data.cache_info}
              devMode={data.dev_mode}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />

            {isLoggedIn && savedToServer && (
              <div className="bg-[#1e3347] border border-[#2a475e] rounded-lg px-4 py-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#5ba65b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[#acb2b8] text-xs">
                  {t('result.saved')}
                  <Link to="/history" className="text-[#1a9fff] hover:text-[#66c0f4] ml-1 transition-colors">
                    {t('result.savedLink')}
                  </Link>
                </p>
              </div>
            )}

            {!isLoggedIn && (
              <div className="bg-[#1b2838] border border-[#2a475e] rounded-lg px-4 py-2.5 flex items-center justify-between gap-2">
                <p className="text-[#acb2b8] text-xs">
                  {t('result.loginPrompt')}
                </p>
                <Link
                  to={`/auth?redirect=/result/${encodeURIComponent(steamInput)}`}
                  className="text-xs text-[#1a9fff] hover:text-[#66c0f4] transition-colors flex-shrink-0"
                >
                  {t('result.loginLink')}
                </Link>
              </div>
            )}

            <div className="space-y-6">
              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t('result.summaryTitle')}
                  </h2>
                  <ShareButton player={data.player} summary={data.summary} />
                </div>
                <SummaryCards player={data.player} summary={data.summary} />
              </section>

              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {t('result.topGamesTitle', { n: Math.min(data.top_games?.length ?? 0, 20) })}
                </h2>
                <div className="overflow-x-auto">
                  <div className="min-w-0">
                    <TopGamesChart games={data.top_games} />
                  </div>
                </div>
              </section>

              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h2 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('result.recentTitle')}
                </h2>
                <div className="overflow-x-auto">
                  <div className="min-w-0">
                    <RecentGamesChart games={data.recent_games} />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-16 pt-16 border-t border-[#2a475e] space-y-8">
              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h3 className="text-[#c6d4df] font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#57cbde]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  {t('result.genreTitle')}
                </h3>
                <GenreSection steamId={data.steamid} />
              </section>

              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h3 className="text-[#c6d4df] font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#f4b63d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 0-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('result.costTitle')}
                </h3>
                <CostRankingSection
                  games={data.top_games}
                  steamId={data.steamid}
                />
              </section>

              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h3 className="text-[#c6d4df] font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#57cbde]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t('result.monthlyTitle')}
                </h3>
                <MonthlyLogSection steamId={data.steamid} />
              </section>

              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h3 className="text-[#c6d4df] font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ffd700]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  {t('result.badgeTitle')}
                </h3>
                <BadgeSection steamId={data.steamid} summary={data.summary} />
              </section>

              <section className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 sm:p-6">
                <h3 className="text-[#c6d4df] font-bold text-lg mb-5 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff6b9d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t('result.annualTitle')}
                </h3>
                <AnnualReportSection player={data.player} summary={data.summary} />
              </section>

              <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-4 sm:p-5">
                <p className="text-[#acb2b8] text-xs mb-3">{t('result.newSearch')}</p>
                <SteamIdForm onSubmit={handleNewSearch} loading={loading} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
