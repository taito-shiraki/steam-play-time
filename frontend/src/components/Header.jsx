import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

export default function Header() {
  const { isLoggedIn, user, logout } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="bg-[#171a21] border-b border-[#2a475e] px-4 sm:px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0">
          <svg
            className="w-8 h-8 text-[#1a9fff]"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
          </svg>
          <span className="text-xl font-bold text-white">SteamStats</span>
        </Link>

        {/* ナビゲーション */}
        <nav className="flex items-center gap-2 sm:gap-3 flex-shrink-0" aria-label={t('header.nav.label')}>
          {/* 友人比較リンク */}
          <Link
            to="/compare"
            className="flex items-center gap-1.5 text-[#acb2b8] hover:text-[#1a9fff] text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">{t('header.compare')}</span>
          </Link>

          {/* 予算管理リンク */}
          <Link
            to="/budget"
            className="flex items-center gap-1.5 text-[#acb2b8] hover:text-[#1a9fff] text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">{t('header.budget')}</span>
          </Link>

          {isLoggedIn ? (
            <>
              {/* 履歴リンク */}
              <Link
                to="/history"
                className="flex items-center gap-1.5 text-[#acb2b8] hover:text-[#1a9fff] text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">{t('header.history')}</span>
              </Link>

              {/* ユーザーメニュー */}
              <div className="flex items-center gap-2 border-l border-[#2a475e] pl-2 sm:pl-3">
                <span
                  className="hidden sm:block text-[#acb2b8] text-xs max-w-[120px] truncate"
                  title={user?.email}
                >
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-[#acb2b8] hover:text-red-400 text-sm transition-colors"
                  aria-label={t('header.logout')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline whitespace-nowrap">{t('header.logout')}</span>
                </button>
              </div>
            </>
          ) : (
            /* 未ログイン時: ログインボタン */
            <Link
              to="/auth"
              className="flex items-center gap-1.5 bg-[#1a9fff] hover:bg-[#0e87e0] text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="whitespace-nowrap">{t('header.login')}</span>
            </Link>
          )}

          {/* 言語切り替えトグル */}
          <div className="border-l border-[#2a475e] pl-2 sm:pl-3">
            <div className="flex items-center bg-[#0e1621] rounded-md p-0.5 gap-0">
              <button
                onClick={() => setLang('ja')}
                className={
                  lang === 'ja'
                    ? 'px-2 py-0.5 text-xs font-bold text-white bg-[#2a475e] rounded transition-colors duration-150'
                    : 'px-2 py-0.5 text-xs font-medium text-[#acb2b8] hover:text-white rounded transition-colors duration-150 cursor-pointer'
                }
                aria-pressed={lang === 'ja'}
                aria-label="日本語に切り替え"
              >
                JA
              </button>
              <button
                onClick={() => setLang('en')}
                className={
                  lang === 'en'
                    ? 'px-2 py-0.5 text-xs font-bold text-white bg-[#2a475e] rounded transition-colors duration-150'
                    : 'px-2 py-0.5 text-xs font-medium text-[#acb2b8] hover:text-white rounded transition-colors duration-150 cursor-pointer'
                }
                aria-pressed={lang === 'en'}
                aria-label="Switch to English"
              >
                EN
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
