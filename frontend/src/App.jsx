import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import ResultPage from './pages/ResultPage'
import ComparePage from './pages/ComparePage'
import AuthPage from './pages/AuthPage'
import HistoryPage from './pages/HistoryPage'
import BudgetPage from './pages/BudgetPage'

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
        <div className="min-h-screen bg-[#1b2838] text-[#c6d4df] flex flex-col">
          <Header />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/result/:steamInput" element={<ResultPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            {/* 404 フォールバック */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />
        </div>
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="bg-[#171a21] border-t border-[#2a475e] px-4 sm:px-6 py-4 text-center mt-auto">
      <p className="text-xs text-[#7a9bb5]">
        {t('footer.tagline')}
      </p>
    </footer>
  )
}

function NotFound() {
  const { t } = useLanguage()
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-bold text-[#2a475e] mb-4">404</p>
      <p className="text-[#c6d4df] text-lg mb-6">{t('notFound.message')}</p>
      <a
        href="/"
        className="bg-[#1a9fff] hover:bg-[#66c0f4] text-white font-semibold px-6 py-3 rounded text-sm transition-colors"
      >
        {t('notFound.backToTop')}
      </a>
    </main>
  )
}

export default App
