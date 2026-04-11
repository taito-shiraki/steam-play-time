/**
 * 総合統計サマリーカード群 (F-004)
 * F-020: i18n対応
 */
import { useLanguage } from '../contexts/LanguageContext'

export default function SummaryCards({ player, summary }) {
  const { lang, t } = useLanguage()
  const locale = lang === 'en' ? 'en-US' : 'ja-JP'

  const totalGames = summary?.total_games ?? 0
  const totalHours = summary?.total_playtime_hours ?? 0
  const topGame = summary?.top_game

  const topGameName = topGame?.name ?? '—'
  const topGameHours = topGame ? Math.round((topGame.playtime_forever ?? 0) / 60) : 0

  return (
    <section aria-label={t('summary.ariaLabel')}>
      {/* プロフィール行 */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
        {/* アバター */}
        <div className="flex-shrink-0">
          {player?.avatarfull ? (
            <img
              src={player.avatarfull}
              alt={`${player.personaname} ${t('summary.player')}`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#1a9fff]/40 object-cover"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#2a475e] bg-[#2a475e] flex items-center justify-center">
              <svg className="w-10 h-10 text-[#4a6a7e]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          )}
        </div>

        {/* プレイヤー名 */}
        <div className="text-center sm:text-left">
          <p className="text-[#acb2b8] text-xs uppercase tracking-wider mb-1">{t('summary.player')}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white break-all">
            {player?.personaname ?? t('summary.unknown')}
          </h2>
          {player?.profileurl && (
            <a
              href={player.profileurl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a9fff] hover:text-[#66c0f4] text-xs transition-colors mt-1 inline-block"
            >
              {t('summary.profileLink')}
            </a>
          )}
        </div>
      </div>

      {/* 統計カード3枚 */}
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-4">
        <StatCard
          label={t('summary.totalHours')}
          value={totalHours.toLocaleString(locale)}
          unit={t('summary.totalHoursUnit')}
          isPrimary
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t('summary.totalGames')}
          value={totalGames.toLocaleString(locale)}
          unit={t('summary.totalGamesUnit')}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          }
        />
        <StatCard
          label={t('summary.topGame')}
          value={topGameName}
          unit={topGame ? `${topGameHours.toLocaleString(locale)} ${t('summary.totalHoursUnit')}` : ''}
          isText
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
          }
        />
      </div>
    </section>
  )
}

function StatCard({ label, value, unit, icon, isText = false, isPrimary = false }) {
  return (
    <div className="bg-[#1e3347] border border-[#2a475e] rounded-lg p-4 sm:p-5 flex gap-4 items-start">
      {/* アイコン */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#1a9fff]/15 text-[#1a9fff] flex items-center justify-center">
        {icon}
      </div>

      {/* テキスト */}
      <div className="min-w-0 flex-1">
        <p className="text-[#acb2b8] text-xs uppercase tracking-wider mb-1">{label}</p>
        {isText ? (
          <>
            <p
              className="text-white font-bold text-base sm:text-lg leading-tight truncate"
              title={value}
            >
              {value}
            </p>
            {unit && <p className="text-[#1a9fff] text-sm mt-0.5">{unit}</p>}
          </>
        ) : isPrimary ? (
          <p className="text-white font-bold text-4xl sm:text-5xl leading-tight">
            {value}
            <span className="text-[#acb2b8] text-lg font-normal ml-2">{unit}</span>
          </p>
        ) : (
          <p className="text-white font-bold text-xl leading-tight">
            {value}
            <span className="text-[#acb2b8] text-sm font-normal ml-1">{unit}</span>
          </p>
        )}
      </div>
    </div>
  )
}
