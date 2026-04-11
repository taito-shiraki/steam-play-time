import { useEffect } from 'react'
import { apiUrl } from '../lib/api'

/**
 * OGP メタタグを動的に設定するカスタムフック (F-018)
 *
 * 結果ページで呼び出すと、`<head>` 内の og:* / twitter:* メタタグを更新する。
 * アンマウント時は元のタイトルに戻す。
 */
export function useOgpMeta({ steamId, player, summary } = {}) {
  useEffect(() => {
    if (!steamId || !player || !summary) return

    // player は Steam API 形式（personaname）または正規化形式（name）の両方に対応
    const playerName = player.personaname || player.name || 'Steamユーザー'
    const totalHours = summary.total_playtime_hours ?? 0
    const topGameName = summary.top_game?.name ?? 'N/A'
    const totalGames = summary.total_games ?? 0

    const title = `${playerName} の Steam プレイ統計 | SteamStats`
    const description =
      `総プレイ時間 ${totalHours}時間 / ${totalGames}本所持 / 最多プレイ「${topGameName}」`
    // 本番環境では VITE_API_URL を使って絶対URLを生成する（OGPクローラはフロントと異なるドメインにアクセスする）
    const ogImagePath = apiUrl(`/api/ogp/image/${steamId}`)
    const ogImageUrl = ogImagePath.startsWith('http')
      ? ogImagePath
      : `${window.location.origin}${ogImagePath}`
    const pageUrl = window.location.href

    // --- ヘルパー ---
    function setMeta(property, content, useProperty = true) {
      const attr = useProperty ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, property)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
      return el
    }

    // ページタイトル
    const prevTitle = document.title
    document.title = title

    // Open Graph
    setMeta('og:type', 'website')
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:url', pageUrl)
    setMeta('og:image', ogImageUrl)
    setMeta('og:image:width', '1200')
    setMeta('og:image:height', '630')
    setMeta('og:site_name', 'SteamStats')
    setMeta('og:locale', 'ja_JP')

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image', false)
    setMeta('twitter:title', title, false)
    setMeta('twitter:description', description, false)
    setMeta('twitter:image', ogImageUrl, false)

    // description
    setMeta('description', description, false)

    return () => {
      document.title = prevTitle
    }
  }, [steamId, player, summary])
}
