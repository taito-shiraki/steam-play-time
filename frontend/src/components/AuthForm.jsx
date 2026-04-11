/**
 * ログイン/登録フォームコンポーネント
 * F-020: i18n対応
 */
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

export default function AuthForm({ mode = 'login', onSuccess }) {
  const { login, register } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // バリデーション
    if (!email.trim()) {
      setError(t('auth.error.emailRequired'))
      return
    }
    if (!password) {
      setError(t('auth.error.passwordRequired'))
      return
    }
    if (isRegister) {
      if (password.length < 6) {
        setError(t('auth.error.passwordTooShort'))
        return
      }
      if (password !== passwordConfirm) {
        setError(t('auth.error.passwordMismatch'))
        return
      }
    }

    setSubmitting(true)
    try {
      if (isRegister) {
        await register(email, password)
      } else {
        await login(email, password)
      }
      onSuccess?.()
    } catch (err) {
      setError(err.message || t('auth.error.general'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* メールアドレス */}
      <div>
        <label htmlFor="auth-email" className="block text-[#acb2b8] text-xs mb-1">
          {t('auth.email')} <span className="text-red-400">{t('auth.required')}</span>
        </label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          required
          autoComplete={isRegister ? 'email' : 'username'}
          className="w-full bg-[#1b2838] border border-[#2a475e] rounded-lg px-3 py-2.5 text-white text-sm
            focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30
            placeholder-[#6a8a9e]"
        />
      </div>

      {/* パスワード */}
      <div>
        <label htmlFor="auth-password" className="block text-[#acb2b8] text-xs mb-1">
          {t('auth.password')} <span className="text-red-400">{t('auth.required')}</span>
          {isRegister && <span className="text-[#7a9bb5] ml-1">{t('auth.passwordHint')}</span>}
        </label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isRegister ? t('auth.passwordPlaceholder') : t('auth.password')}
          required
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          className="w-full bg-[#1b2838] border border-[#2a475e] rounded-lg px-3 py-2.5 text-white text-sm
            focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30
            placeholder-[#6a8a9e]"
        />
      </div>

      {/* パスワード確認（登録時のみ） */}
      {isRegister && (
        <div>
          <label htmlFor="auth-password-confirm" className="block text-[#acb2b8] text-xs mb-1">
            {t('auth.passwordConfirm')} <span className="text-red-400">{t('auth.required')}</span>
          </label>
          <input
            id="auth-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder={t('auth.passwordConfirmPlaceholder')}
            required
            autoComplete="new-password"
            className="w-full bg-[#1b2838] border border-[#2a475e] rounded-lg px-3 py-2.5 text-white text-sm
              focus:outline-none focus:border-[#1a9fff] focus:ring-1 focus:ring-[#1a9fff]/30
              placeholder-[#6a8a9e]"
          />
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg px-3 py-2">
          <p className="text-red-400 text-xs" role="alert">{error}</p>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-[#1a9fff] hover:bg-[#0e87e0] disabled:opacity-50 disabled:cursor-not-allowed
          text-white font-semibold rounded-lg text-sm transition-colors"
      >
        {submitting
          ? (isRegister ? t('auth.registering') : t('auth.loggingIn'))
          : (isRegister ? t('auth.register') : t('auth.login'))}
      </button>
    </form>
  )
}
