import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SteamIdForm from '../components/SteamIdForm'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * トップページ (F-001, F-025, F-026, F-027, F-028)
 * Sprint 15: SEO最適化ランディングページ全面改修
 */

// SVGアイコン（Heroicons outline風）
function IconBarChart({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function IconPieChart({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
  )
}

function IconCurrencyYen({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25L12 3l3 5.25M6.75 12h10.5M6.75 15.75h10.5M12 20.25v-8.25" />
    </svg>
  )
}

function IconUserGroup({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function IconWallet({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  )
}

function IconChevronDown({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

// FAQアコーディオンアイテム
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <details
      className="bg-[#171a21] border border-[#2a475e]/40 rounded-lg overflow-hidden"
      open={open}
      onToggle={(e) => setOpen(e.target.open)}
    >
      <summary className="list-none flex justify-between items-center px-5 py-4 cursor-pointer hover:bg-[#2a475e]/20 transition-colors">
        <span className="text-white font-medium text-sm sm:text-base">{question}</span>
        <IconChevronDown
          className={`w-5 h-5 text-[#66c0f4] flex-shrink-0 ml-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </summary>
      <div className="px-5 pb-4 pt-1">
        <p className="text-[#acb2b8] text-sm leading-relaxed">{answer}</p>
      </div>
    </details>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  function handleSubmit(steamInput) {
    navigate(`/result/${encodeURIComponent(steamInput)}`)
  }

  const features = [
    {
      id: 'top20',
      titleKey: 'home.features.top20.title',
      descKey: 'home.features.top20.desc',
      icon: IconBarChart,
      iconClass: 'text-[#1a9fff]',
      span: 'sm:col-span-2',
      cardClass: 'bg-[#171a21] p-8 sm:p-10 rounded-xl',
    },
    {
      id: 'genre',
      titleKey: 'home.features.genre.title',
      descKey: 'home.features.genre.desc',
      icon: IconPieChart,
      iconClass: 'text-[#66c0f4]',
      span: '',
      cardClass: 'bg-[#171a21]/60 border border-[#2a475e]/30 rounded-lg p-5 sm:p-6',
    },
    {
      id: 'cospa',
      titleKey: 'home.features.cospa.title',
      descKey: 'home.features.cospa.desc',
      icon: IconCurrencyYen,
      iconClass: 'text-[#66c0f4]',
      span: '',
      cardClass: 'bg-[#171a21]/60 border border-[#2a475e]/30 rounded-lg p-5 sm:p-6',
    },
    {
      id: 'compare',
      titleKey: 'home.features.compare.title',
      descKey: 'home.features.compare.desc',
      icon: IconUserGroup,
      iconClass: 'text-[#66c0f4]',
      span: '',
      cardClass: 'bg-[#171a21]/60 border border-[#2a475e]/30 rounded-lg p-5 sm:p-6',
    },
    {
      id: 'budget',
      titleKey: 'home.features.budget.title',
      descKey: 'home.features.budget.desc',
      icon: IconWallet,
      iconClass: 'text-[#66c0f4]',
      span: '',
      cardClass: 'bg-[#171a21]/60 border border-[#2a475e]/30 rounded-lg p-5 sm:p-6',
    },
  ]

  const faqItems = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
    { q: t('home.faq.q4'), a: t('home.faq.a4') },
    { q: t('home.faq.q5'), a: t('home.faq.a5') },
    { q: t('home.faq.q6'), a: t('home.faq.a6') },
  ]

  return (
    <main className="flex-1">

      {/* ヒーローセクション */}
      <section
        className="px-4 sm:px-6 py-20 sm:py-28 flex flex-col items-center"
        aria-labelledby="hero-heading"
      >
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <h1
              id="hero-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight"
            >
              {t('home.hero.heading')}
            </h1>
            <p className="text-[#acb2b8] text-base sm:text-lg leading-relaxed">
              {t('home.hero.desc')}
            </p>
          </div>

          {/* 入力フォームカード */}
          <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-6 sm:p-8 shadow-xl">
            <span className="block text-white font-semibold text-base mb-4">
              {t('home.form.title')}
            </span>
            <SteamIdForm onSubmit={handleSubmit} loading={false} />
          </div>

          {/* プロフィール公開の注記 */}
          <p className="mt-6 text-center text-[#7a9bb5] text-xs">
            {t('home.publicNote')}
          </p>
        </div>
      </section>

      {/* 機能紹介セクション */}
      <section
        className="px-4 sm:px-6 py-20 sm:py-24 border-t border-[#2a475e]/30"
        aria-labelledby="features-heading"
      >
        <div className="max-w-4xl mx-auto">
          <h2
            id="features-heading"
            className="text-2xl sm:text-3xl font-bold text-white text-center mb-10"
          >
            {t('home.features.heading')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.id}
                  className={`${feature.span} ${feature.cardClass}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className={`w-7 h-7 ${feature.iconClass}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                        {t(feature.titleKey)}
                      </h3>
                      <p className="text-[#acb2b8] text-sm sm:text-base leading-relaxed">
                        {t(feature.descKey)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQセクション */}
      <section
        className="px-4 sm:px-6 py-20 sm:py-24 border-t border-[#2a475e]/30"
        aria-labelledby="faq-heading"
      >
        <div className="max-w-3xl mx-auto">
          {/* 使い方ミニガイド */}
          <p className="text-sm text-[#7a9bb5] text-center mb-16">
            {t('home.steps.inline')}
          </p>

          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl font-bold text-white text-center mb-10"
          >
            {t('home.faq.heading')}
          </h2>

          <div className="flex flex-col gap-3">
            {faqItems.map((item, idx) => (
              <FaqItem key={idx} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

    </main>
  )
}
