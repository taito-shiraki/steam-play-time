/**
 * 認証状態管理コンテキスト
 * - ログイン/ログアウト/登録の状態をグローバル管理
 * - JWTトークンをlocalStorageに保存
 * - アプリ起動時に /api/auth/me で認証状態を復元
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiUrl } from '../lib/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'steamstats_token'
const USER_KEY = 'steamstats_user'

/** APIリクエスト共通関数 */
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(apiUrl(path), { ...options, headers })
  return res
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true) // 初期認証状態確認中

  /** トークンを保存してuserをセット */
  const saveAuth = useCallback((tokenValue, userData) => {
    localStorage.setItem(TOKEN_KEY, tokenValue)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setToken(tokenValue)
    setUser(userData)
  }, [])

  /** 認証情報をクリア */
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  /** アプリ起動時にlocalStorageから復元して /api/auth/me で検証 */
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (!storedToken) {
      setLoading(false)
      return
    }
    // トークンを仮セット
    setToken(storedToken)
    // サーバーで検証
    fetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('token invalid')
      })
      .then((userData) => {
        setUser(userData)
        localStorage.setItem(USER_KEY, JSON.stringify(userData))
      })
      .catch(() => {
        // トークン無効なら削除
        clearAuth()
      })
      .finally(() => setLoading(false))
  }, [clearAuth])

  /** アカウント登録 */
  const register = useCallback(async (email, password) => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || '登録に失敗しました')
    }
    saveAuth(data.access_token, data.user)
    return data.user
  }, [saveAuth])

  /** ログイン */
  const login = useCallback(async (email, password) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.detail || 'ログインに失敗しました')
    }
    saveAuth(data.access_token, data.user)
    return data.user
  }, [saveAuth])

  /** ログアウト */
  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // エラーでも問題なし
    }
    clearAuth()
  }, [clearAuth])

  /** 認証済みAPIリクエスト */
  const authFetch = useCallback(async (path, options = {}) => {
    const currentToken = localStorage.getItem(TOKEN_KEY)
    const headers = {
      'Content-Type': 'application/json',
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...options.headers,
    }
    return fetch(apiUrl(path), { ...options, headers })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggedIn: !!user,
        register,
        login,
        logout,
        authFetch,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/** AuthContextを使うカスタムフック */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
