import { useEffect, useRef } from 'react'
import { useGenreStats } from '../hooks/useGenreStats'
import GenreChart from './GenreChart'
import LoadingSpinner from './LoadingSpinner'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * ジャンル別集計セクション（F-010）
 * F-020: i18n対応
 */
export default function GenreSection({ steamId }) {
  const { data, loading, error, fetchGenres } = useGenreStats()
  const { t } = useLanguage()
  const fetchedRef = useRef(null)

  useEffect(() => {
    if (!steamId) return
    if (fetchedRef.current === steamId) return
    fetchedRef.current = steamId
    fetchGenres(steamId)
  }, [steamId, fetchGenres])

  return (
    <div>
      {loading && (
        <div className="py-6">
          <LoadingSpinner message={t('genreSection.loading')} />
          <p className="text-[#acb2b8] text-xs text-center mt-2">
            {t('genreSection.loadingNote')}
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-6">
          <p className="text-red-400 text-sm mb-3">{error.message}</p>
          <button
            onClick={() => {
              fetchedRef.current = null
              fetchGenres(steamId)
            }}
            className="px-4 py-2 bg-[#1a9fff] hover:bg-[#0e87e0] text-white text-sm rounded-lg transition-colors"
          >
            {t('genreSection.retry')}
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {data.dev_mode && (
            <div className="mb-4 px-3 py-2 bg-[#1b2838] border border-[#4a5568] rounded-lg">
              <p className="text-[#acb2b8] text-xs">
                {t('genreSection.devMode')}
              </p>
            </div>
          )}
          <GenreChart genreData={data} />
        </>
      )}

      {!loading && !error && !data && (
        <div className="text-[#acb2b8] text-sm text-center py-8">
          {t('genreSection.noData')}
        </div>
      )}
    </div>
  )
}
