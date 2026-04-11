import { useState, useCallback } from 'react'
import { apiUrl } from '../lib/api'

/**
 * Steam ジャンル別プレイ時間統計を取得するカスタムフック
 *
 * /api/steam/genres/{steam_id} を呼び出し、ジャンル別集計データを返す。
 */
export function useGenreStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchGenres = useCallback(async (steamInput, forceRefresh = false) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const encoded = encodeURIComponent(steamInput.trim())
      const url = apiUrl(`/api/steam/genres/${encoded}${forceRefresh ? '?force_refresh=true' : ''}`)
      const res = await fetch(url)

      if (!res.ok) {
        let detail
        try {
          const json = await res.json()
          detail = json.detail
        } catch {
          detail = null
        }

        setError({
          type: 'API_ERROR',
          message: typeof detail === 'string' ? detail : 'ジャンルデータの取得に失敗しました',
        })
        return
      }

      const json = await res.json()
      setData(json)
    } catch {
      setError({
        type: 'NETWORK_ERROR',
        message: 'ネットワークエラーが発生しました。接続を確認してください。',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, fetchGenres, reset }
}
