/**
 * API ベース URL ヘルパー
 *
 * - 開発環境（VITE_API_URL 未設定）: 相対パス "/api/..." → Vite dev proxy が localhost:8001 に転送
 * - 本番環境（VITE_API_URL 設定済み）: 絶対URL "https://xxx.onrender.com/api/..." に変換
 */

/** 環境変数から取得したAPIベースURL。末尾スラッシュを除去して正規化する */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/**
 * APIパスをフルURLに変換する
 * @param {string} path - "/api/steam/stats/xxx" のような先頭スラッシュつきのパス
 * @returns {string} 本番時は絶対URL、開発時は相対パスをそのまま返す
 */
export function apiUrl(path) {
  if (!API_BASE) {
    // 開発環境: 相対パスのまま返す（Vite proxyが処理する）
    return path
  }
  // 本番環境: VITE_API_URL をベースにした絶対URLを生成
  // path が "/api/..." の場合、API_BASE + path で "https://xxx.onrender.com/api/..."
  return `${API_BASE}${path}`
}
