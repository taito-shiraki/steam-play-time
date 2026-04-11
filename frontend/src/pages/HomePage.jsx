import { useNavigate } from 'react-router-dom'
import SteamIdForm from '../components/SteamIdForm'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * トップページ (F-001, F-007, F-008)
 * F-020: i18n対応
 */
export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  function handleSubmit(steamInput) {
    navigate(`/result/${encodeURIComponent(steamInput)}`)
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-2xl w-full">
        {/* ヒーローテキスト */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1a9fff]/15 flex items-center justify-center">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-[#1a9fff]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {t('home.hero.heading')}
            <br />
            <span className="text-[#1a9fff]">{t('home.hero.headingAccent')}</span>
          </h1>
          <p className="text-[#acb2b8] text-base sm:text-lg leading-relaxed">
            {t('home.hero.desc')}
          </p>
        </div>

        {/* 入力フォームカード */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-white font-semibold text-base mb-4">{t('home.form.title')}</h2>
          <SteamIdForm onSubmit={handleSubmit} loading={false} />
        </div>

        {/* プロフィール公開の注記 */}
        <p className="mt-8 text-center text-[#7a9bb5] text-xs">
          {t('home.publicNote')}
        </p>
      </div>
    </main>
  )
}
