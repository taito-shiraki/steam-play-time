/**
 * 言語切り替えコンテキスト (F-020)
 *
 * - LanguageProvider: アプリ全体をラップして言語状態を提供
 * - useLanguage(): { lang, setLang, t } を返すフック
 * - localStorage キー: steamstats-lang
 * - 初期値: "ja"
 * - t(key, vars?): 辞書からテキストを取得。vars はプレースホルダー置換用
 *   例: t('cache.ageLabel', { minutes: 5 }) → "— 5 分前のデータです"
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import ja from '../i18n/ja'
import en from '../i18n/en'

const STORAGE_KEY = 'steamstats-lang'
const DICTS = { ja, en }

function getInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'ja' || stored === 'en') return stored
  } catch {
    // localStorage 不可
  }
  return 'ja'
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  // lang 変更時に localStorage と <html lang=""> を更新
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // 無視
    }
    document.documentElement.lang = lang
  }, [lang])

  // 初回マウント時も <html lang=""> を設定
  useEffect(() => {
    document.documentElement.lang = lang
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLang = useCallback((newLang) => {
    if (newLang === 'ja' || newLang === 'en') {
      setLangState(newLang)
    }
  }, [])

  /**
   * テキスト取得関数
   * @param {string} key  ドット区切りのキー
   * @param {Object} [vars]  プレースホルダー置換マップ { key: value }
   * @returns {string}
   */
  const t = useCallback((key, vars) => {
    const dict = DICTS[lang] || DICTS.ja
    let text = dict[key]
    if (text === undefined) {
      // フォールバック: キー文字列をそのまま返す
      return key
    }
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      })
    }
    return text
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
