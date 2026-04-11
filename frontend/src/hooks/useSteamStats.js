import { useState, useCallback } from 'react'
import { apiUrl } from '../lib/api'

/**
 * Steam 統計データを取得するカスタムフック
 *
 * /api/steam/stats/{input} を呼び出し、プレイヤー情報・サマリー・ゲームリストを返す。
 */
export function useSteamStats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async (steamInput, forceRefresh = false) => {
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const encoded = encodeURIComponent(steamInput.trim())
      const url = apiUrl(`/api/steam/stats/${encoded}${forceRefresh ? '?force_refresh=true' : ''}`)
      const res = await fetch(url)

      if (!res.ok) {
        let detail
        try {
          const json = await res.json()
          detail = json.detail
        } catch {
          detail = null
        }

        if (res.status === 403 && detail && detail.error_code === 'PROFILE_PRIVATE') {
          // プロフィール非公開
          setError({ type: 'PROFILE_PRIVATE', detail })
        } else if (res.status === 400) {
          setError({ type: 'INVALID_INPUT', message: detail || '入力形式が正しくありません' })
        } else if (res.status === 404) {
          setError({ type: 'NOT_FOUND', message: detail || 'Steam IDが見つかりません' })
        } else {
          setError({ type: 'API_ERROR', message: detail || 'データの取得に失敗しました' })
        }
        return
      }

      const json = await res.json()
      setData(json)
    } catch (e) {
      setError({ type: 'NETWORK_ERROR', message: 'ネットワークエラーが発生しました。接続を確認してください。' })
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(
    (steamInput) => fetchStats(steamInput, true),
    [fetchStats],
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, fetchStats, refresh, reset }
}
