import { motion } from 'framer-motion'
import { t as defaultDict, type Lang } from '../i18n'
import { ScreenTitle } from '../ui'
import { FlagIcon, PauseIcon } from '../icons'

/**
 * Replaces the whole game flow when a campaign is ended or in maintenance
 * (see engine/CampaignEngine.tsx's isEnded/isMaintenance gate) — the header
 * (logo/brand) still renders around this, only the game area is swapped
 * out, so the site still reads as branded rather than just broken.
 */
export default function UnavailableScreen({
  kind,
  lang,
  dict = defaultDict,
}: {
  kind: 'ended' | 'maintenance'
  lang: Lang
  dict?: Record<string, { fr: string; ar: string; en?: string }>
}) {
  const isEnded = kind === 'ended'
  const label = isEnded ? dict.campaignEndedTitle[lang] : dict.campaignMaintenanceTitle[lang]
  const message = isEnded ? dict.campaignEndedMessage[lang] : dict.campaignMaintenanceMessage[lang]

  return (
    <div className="max-w-lg">
      <ScreenTitle label={label} title={label} />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[2rem] border p-8 text-center backdrop-blur-xl"
        style={{
          borderColor: 'color-mix(in srgb, var(--hairline) 160%, transparent)',
          background: 'color-mix(in srgb, var(--card) 74%, transparent)',
          boxShadow: '0 20px 44px -24px rgba(0,0,0,0.18)',
        }}
      >
        <span
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
          style={{
            background: 'linear-gradient(155deg, color-mix(in srgb, var(--brand-primary) 85%, white 15%), var(--brand-primary))',
            boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
          }}
        >
          {isEnded ? <FlagIcon className="h-7 w-7" /> : <PauseIcon className="h-7 w-7" />}
        </span>
        <p className="mx-auto max-w-sm text-[15px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          {message}
        </p>
      </motion.div>
    </div>
  )
}
