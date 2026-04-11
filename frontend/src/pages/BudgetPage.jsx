import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * 月間ゲーム予算管理ページ (F-016)
 * F-020: i18n対応
 *
 * - 月間予算上限の設定
 * - 購入記録の手動入力（日付・ゲーム名・金額）
 * - 累計額・残り予算・消化率プログレスバー
 * - 80% 超過時に警告バナー（黄色）、100% 超過時に赤色警告
 * - データは localStorage に保存（キー: game_budget_{year}_{month}）
 */

function buildStorageKey(year, month) {
  return `game_budget_${year}_${String(month).padStart(2, '0')}`
}

function loadData(year, month) {
  try {
    const raw = localStorage.getItem(buildStorageKey(year, month))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveData(year, month, data) {
  localStorage.setItem(buildStorageKey(year, month), JSON.stringify(data))
}

const EMPTY_RECORD = { date: '', gameName: '', amount: '' }

export default function BudgetPage() {
  const { t, lang } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-12

  const [budget, setBudget] = useState(0)           // 月間予算上限（円）
  const [budgetInput, setBudgetInput] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)

  const [purchases, setPurchases] = useState([])    // 購入記録リスト
  const [newRecord, setNewRecord] = useState({ ...EMPTY_RECORD })
  const [addError, setAddError] = useState('')

  // 年月変更時にlocalStorageからデータ読み込み
  useEffect(() => {
    const data = loadData(year, month)
    if (data) {
      setBudget(data.budget ?? 0)
      setBudgetInput(String(data.budget ?? 0))
      setPurchases(data.purchases ?? [])
    } else {
      setBudget(0)
      setBudgetInput('0')
      setPurchases([])
    }
    setEditingBudget(false)
    setAddError('')
  }, [year, month])

  // データ永続化
  const persist = useCallback((newBudget, newPurchases) => {
    saveData(year, month, { budget: newBudget, purchases: newPurchases })
  }, [year, month])

  // 予算保存
  function handleSaveBudget() {
    const val = parseInt(budgetInput, 10)
    if (isNaN(val) || val < 0) {
      setBudgetInput(String(budget))
      setEditingBudget(false)
      return
    }
    setBudget(val)
    persist(val, purchases)
    setEditingBudget(false)
  }

  // 購入記録追加
  function handleAddRecord() {
    setAddError('')
    const amount = parseInt(newRecord.amount, 10)
    if (!newRecord.gameName.trim()) {
      setAddError(t('budget.addError.noName'))
      return
    }
    if (isNaN(amount) || amount <= 0) {
      setAddError(t('budget.addError.invalidAmount'))
      return
    }
    const record = {
      id: Date.now(),
      date: newRecord.date || new Date().toISOString().slice(0, 10),
      gameName: newRecord.gameName.trim(),
      amount,
    }
    const updated = [...purchases, record].sort((a, b) => a.date.localeCompare(b.date))
    setPurchases(updated)
    persist(budget, updated)
    setNewRecord({ ...EMPTY_RECORD })
  }

  // 購入記録削除
  function handleDeleteRecord(id) {
    const updated = purchases.filter((p) => p.id !== id)
    setPurchases(updated)
    persist(budget, updated)
  }

  // 集計
  const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0)
  const remaining = budget - totalSpent
  const usageRate = budget > 0 ? Math.min((totalSpent / budget) * 100, 999) : 0
  const isOver80 = budget > 0 && usageRate >= 80
  const isOver100 = budget > 0 && usageRate >= 100

  // 年月セレクト用の選択肢
  const yearOptions = []
  for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 1; y++) yearOptions.push(y)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  // プログレスバーの色
  const progressColor = isOver100
    ? 'bg-red-500'
    : isOver80
    ? 'bg-yellow-500'
    : 'bg-[#1a9fff]'

  const currencyUnit = t('budget.unit.yen')

  return (
    <main className="flex-1 px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-extrabold text-white mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('budget.title')}
        </h1>
        <p className="text-[#acb2b8] text-sm mb-6">
          {t('budget.desc')}
        </p>

        {/* 年月選択 */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
          <span className="text-[#acb2b8] text-sm font-medium">{t('budget.targetMonth')}</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-[#1b2838] border border-[#2a475e] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9fff]"
            aria-label={t('budget.yearLabel')}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}{t('budget.yearUnit')}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-[#1b2838] border border-[#2a475e] text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9fff]"
            aria-label={t('budget.monthLabel')}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}{t('budget.monthUnit')}</option>
            ))}
          </select>
        </div>

        {/* 警告バナー（80% / 100%） */}
        {isOver100 && (
          <div
            className="mb-5 flex items-start gap-3 bg-red-900/40 border border-red-500 text-red-200 rounded-xl px-4 py-3"
            role="alert"
            aria-live="assertive"
          >
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-red-300 text-sm">{t('budget.over100.title')}</p>
              <p className="text-xs mt-0.5">
                {t('budget.over100.message', {
                  spent: totalSpent.toLocaleString(locale),
                  budget: budget.toLocaleString(locale),
                  over: Math.abs(remaining).toLocaleString(locale),
                })}
              </p>
            </div>
          </div>
        )}

        {isOver80 && !isOver100 && (
          <div
            className="mb-5 flex items-start gap-3 bg-yellow-900/40 border border-yellow-500 text-yellow-200 rounded-xl px-4 py-3"
            role="alert"
            aria-live="polite"
          >
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-yellow-300 text-sm">{t('budget.over80.title')}</p>
              <p className="text-xs mt-0.5">
                {t('budget.over80.message', {
                  rate: Math.round(usageRate),
                  remaining: remaining.toLocaleString(locale),
                })}
              </p>
            </div>
          </div>
        )}

        {/* 予算設定カード */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 mb-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#1a9fff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('budget.settingTitle')}
          </h2>

          {editingBudget ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <input
                  type="number"
                  min="0"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget() }}
                  className="w-full bg-[#1b2838] border border-[#2a475e] focus:border-[#1a9fff] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9fff] pr-8"
                  placeholder={t('budget.placeholder')}
                  aria-label={t('budget.ariaLabel')}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#acb2b8] text-sm pointer-events-none">{currencyUnit}</span>
              </div>
              <button
                onClick={handleSaveBudget}
                className="px-4 py-2 bg-[#2a475e] hover:bg-[#3d6680] text-white font-semibold text-sm rounded-lg transition-colors"
              >
                {t('budget.save')}
              </button>
              <button
                onClick={() => { setBudgetInput(String(budget)); setEditingBudget(false) }}
                className="px-4 py-2 bg-[#2a475e] hover:bg-[#3d6680] text-white text-sm rounded-lg transition-colors"
              >
                {t('budget.cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-[#acb2b8] text-xs mb-0.5">{t('budget.todayBudget')}</p>
                <p className="text-2xl font-bold text-white">
                  {budget > 0 ? `${budget.toLocaleString(locale)} ${currencyUnit}` : t('budget.unset')}
                </p>
              </div>
              <button
                onClick={() => setEditingBudget(true)}
                className="ml-auto px-3 py-1.5 bg-[#2a475e] hover:bg-[#3d6680] text-white text-sm rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('budget.edit')}
              </button>
            </div>
          )}
        </div>

        {/* 予算消化サマリー */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 mb-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#57cbde]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('budget.summaryTitle')}
          </h2>

          {/* 残り予算: 全幅ヒーロー */}
          <div className="bg-[#1b2838] rounded-lg p-5 text-center mb-3">
            <p className="text-[#acb2b8] text-xs mb-1">{t('budget.remaining')}</p>
            <p className={`text-3xl font-bold ${isOver100 ? 'text-red-400' : isOver80 ? 'text-yellow-400' : 'text-[#57cbde]'}`}>
              {remaining >= 0 ? remaining.toLocaleString(locale) : `-${Math.abs(remaining).toLocaleString(locale)}`}
              <span className="text-sm font-normal ml-1">{currencyUnit}</span>
            </p>
          </div>
          {/* 累計購入額と消化率: 2列 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#1b2838] rounded-lg p-3 text-center">
              <p className="text-[#acb2b8] text-xs mb-1">{t('budget.totalSpent')}</p>
              <p className="text-lg font-bold text-white">{totalSpent.toLocaleString(locale)}<span className="text-xs font-normal ml-0.5">{currencyUnit}</span></p>
            </div>
            <div className="bg-[#1b2838] rounded-lg p-3 text-center">
              <p className="text-[#acb2b8] text-xs mb-1">{t('budget.usageRate')}</p>
              <p className={`text-lg font-bold ${isOver100 ? 'text-red-400' : isOver80 ? 'text-yellow-400' : 'text-[#1a9fff]'}`}>
                {budget > 0 ? `${Math.round(usageRate)}%` : '—'}
              </p>
            </div>
          </div>

          {/* プログレスバー */}
          {budget > 0 && (
            <div>
              <div
                className="w-full bg-[#1b2838] rounded-full h-4 overflow-hidden border border-[#2a475e]"
                role="progressbar"
                aria-valuenow={Math.round(usageRate)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('budget.progressAriaLabel', { rate: Math.round(usageRate) })}
              >
                <div
                  className={`h-4 rounded-full transition-[width] duration-300 ${progressColor}`}
                  style={{ width: `${Math.min(usageRate, 100)}%` }}
                />
              </div>
              {/* 80% マーカー */}
              <div className="relative mt-1">
                <div
                  className="absolute top-0 w-px h-3 bg-yellow-500 opacity-70"
                  style={{ left: '80%' }}
                  aria-hidden="true"
                />
                <p className="text-yellow-500 text-xs" style={{ marginLeft: '80%', transform: 'translateX(-50%)' }}>80%</p>
              </div>
            </div>
          )}

          {budget === 0 && (
            <p className="text-[#acb2b8] text-sm text-center py-2">
              {t('budget.noBudget')}
            </p>
          )}
        </div>

        {/* 購入記録入力フォーム */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5 mb-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#f4b63d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('budget.addTitle')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[#acb2b8] text-xs mb-1 block" htmlFor="purchase-date">{t('budget.purchaseDate')}</label>
              <input
                id="purchase-date"
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord((r) => ({ ...r, date: e.target.value }))}
                className="w-full bg-[#1b2838] border border-[#2a475e] focus:border-[#1a9fff] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9fff]"
              />
            </div>
            <div>
              <label className="text-[#acb2b8] text-xs mb-1 block" htmlFor="purchase-game">{t('budget.purchaseGame')}</label>
              <input
                id="purchase-game"
                type="text"
                value={newRecord.gameName}
                onChange={(e) => setNewRecord((r) => ({ ...r, gameName: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRecord() }}
                placeholder={t('budget.purchasePlaceholder')}
                className="w-full bg-[#1b2838] border border-[#2a475e] focus:border-[#1a9fff] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9fff] placeholder-[#6a8a9e]"
              />
            </div>
            <div>
              <label className="text-[#acb2b8] text-xs mb-1 block" htmlFor="purchase-amount">{t('budget.purchaseAmount')}</label>
              <div className="relative">
                <input
                  id="purchase-amount"
                  type="number"
                  min="1"
                  value={newRecord.amount}
                  onChange={(e) => setNewRecord((r) => ({ ...r, amount: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddRecord() }}
                  placeholder={t('budget.amountPlaceholder')}
                  className="w-full bg-[#1b2838] border border-[#2a475e] focus:border-[#1a9fff] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9fff] placeholder-[#6a8a9e] pr-7"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#acb2b8] text-xs pointer-events-none">{currencyUnit}</span>
              </div>
            </div>
          </div>

          {addError && (
            <p className="text-red-400 text-xs mb-2" role="alert">{addError}</p>
          )}

          <button
            onClick={handleAddRecord}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#2a475e] hover:bg-[#3d6680] text-white font-bold text-sm rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#2a475e] focus:ring-offset-2 focus:ring-offset-[#171a21]"
          >
            {t('budget.addButton')}
          </button>
        </div>

        {/* 購入記録一覧 */}
        <div className="bg-[#171a21] border border-[#2a475e] rounded-xl p-5">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#acb2b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {t('budget.listTitle')}
            <span className="text-[#acb2b8] text-xs font-normal ml-auto">{t('budget.listCount', { n: purchases.length })}</span>
          </h2>

          {purchases.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 text-[#2a475e] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-[#acb2b8] text-sm">{t('budget.empty.message')}</p>
              <p className="text-[#7a9bb5] text-xs mt-1">{t('budget.empty.hint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* ヘッダー */}
              <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-3 py-1.5 text-[#acb2b8] text-xs font-semibold border-b border-[#2a475e]">
                <span>{t('budget.colDate')}</span>
                <span>{t('budget.colGame')}</span>
                <span className="text-right">{t('budget.colAmount')}</span>
                <span />
              </div>

              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_2fr_1fr_auto] gap-2 sm:gap-3 items-center px-3 py-2.5 rounded-lg bg-[#1b2838] hover:bg-[#1e2d3d] transition-colors group"
                >
                  {/* モバイル: 左列にまとめ */}
                  <div className="sm:hidden">
                    <p className="text-white text-sm font-medium">{p.gameName}</p>
                    <p className="text-[#acb2b8] text-xs">{p.date} — {p.amount.toLocaleString(locale)}{currencyUnit}</p>
                  </div>

                  {/* デスクトップ: 分割 */}
                  <span className="hidden sm:block text-[#acb2b8] text-sm">{p.date}</span>
                  <span className="hidden sm:block text-white text-sm">{p.gameName}</span>
                  <span className="hidden sm:block text-right text-white text-sm font-medium">{p.amount.toLocaleString(locale)}{currencyUnit}</span>

                  {/* 削除ボタン */}
                  <button
                    onClick={() => handleDeleteRecord(p.id)}
                    className="flex-shrink-0 text-[#4a6a8e] hover:text-red-400 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label={t('budget.deleteAriaLabel', { name: p.gameName })}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* 合計行 */}
              <div className="flex items-center justify-between px-3 py-3 border-t border-[#2a475e] mt-2">
                <span className="text-[#acb2b8] text-sm font-semibold">{t('budget.total')}</span>
                <span className={`text-base font-bold ${isOver100 ? 'text-red-400' : isOver80 ? 'text-yellow-400' : 'text-white'}`}>
                  {totalSpent.toLocaleString(locale)}{currencyUnit}
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
