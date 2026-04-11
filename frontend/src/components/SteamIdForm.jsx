import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Steam ID 入力フォーム (F-001)
 * F-020: i18n対応
 */
export default function SteamIdForm({ onSubmit, loading }) {
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState('')
  const { t } = useLanguage()

  function validate(value) {
    const v = value.trim()
    if (!v) return t('form.error.empty')
    if (v.length < 2) return t('form.error.tooShort')
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate(input)
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError('')
    onSubmit(input.trim())
  }

  function handleChange(e) {
    setInput(e.target.value)
    if (validationError) setValidationError('')
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="steam-id-input" className="sr-only">
            {t('form.label')}
          </label>
          <input
            id="steam-id-input"
            type="text"
            value={input}
            onChange={handleChange}
            placeholder={t('form.placeholder')}
            disabled={loading}
            autoComplete="off"
            className={[
              'w-full bg-[#1b2838] text-white placeholder-[#7a9bb5]',
              'border rounded px-4 py-3 text-sm outline-none',
              'transition-colors focus:ring-2 focus:ring-[#1a9fff]/50',
              validationError
                ? 'border-[#c94f4f] focus:border-[#c94f4f]'
                : 'border-[#2a475e] focus:border-[#1a9fff]',
              loading ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
            aria-describedby={validationError ? 'input-error' : 'input-hint'}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={[
            'bg-[#1a9fff] hover:bg-[#66c0f4] active:bg-[#1585d8]',
            'text-white font-bold px-6 py-3 rounded text-sm',
            'transition-colors whitespace-nowrap',
            'flex items-center justify-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-[#1a9fff]/50',
          ].join(' ')}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
              {t('form.submitting')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              {t('form.submit')}
            </>
          )}
        </button>
      </div>

      {/* バリデーションエラー */}
      {validationError && (
        <p id="input-error" role="alert" className="mt-2 text-[#c94f4f] text-xs">
          {validationError}
        </p>
      )}

      {/* ヒント */}
      {!validationError && (
        <p id="input-hint" className="mt-2 text-[#7a9bb5] text-xs">
          {t('form.hint')}
        </p>
      )}
    </form>
  )
}
