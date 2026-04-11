/**
 * ログイン/登録ページ（/auth ルート）
 * - タブ切り替えでログインと新規登録を切り替え
 * - ログイン成功後はトップページまたはリダイレクト先に遷移
 * F-020: i18n対応
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import AuthForm from '../components/AuthForm'

export default function AuthPage() {
  const { isLoggedIn } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login')

  // すでにログイン済みならトップページへ
  useEffect(() => {
    if (isLoggedIn) {
      const redirect = searchParams.get('redirect') || '/'
      navigate(redirect, { replace: true })
    }
  }, [isLoggedIn, navigate, searchParams])

  function handleSuccess() {
    const redirect = searchParams.get('redirect') || '/'
    navigate(redirect, { replace: true })
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <svg className="w-8 h-8 text-[#1a9fff]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
            </svg>
            <span className="text-xl font-bold text-white">SteamStats</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">
            {mode === 'register' ? t('authPage.title.register') : t('authPage.title.login')}
          </h1>
          <p className="text-[#acb2b8] text-sm">
            {mode === 'register' ? t('authPage.desc.register') : t('authPage.desc.login')}
          </p>
        </div>

        {/* フォームカード */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-6 sm:p-8">
          {/* タブ切り替え */}
          <div className="flex bg-[#1b2838] rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-[#2a475e] text-white shadow'
                  : 'text-[#acb2b8] hover:text-white'
              }`}
            >
              {t('authPage.tab.login')}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-[#2a475e] text-white shadow'
                  : 'text-[#acb2b8] hover:text-white'
              }`}
            >
              {t('authPage.tab.register')}
            </button>
          </div>

          {/* 認証フォーム */}
          <AuthForm mode={mode} onSuccess={handleSuccess} />
        </div>

      </div>
    </main>
  )
}
