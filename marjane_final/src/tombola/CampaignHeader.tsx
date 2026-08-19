import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Brand } from './brands'
import { t, STEP_LABELS, type Lang } from './i18n'
import { ArrowLeft, ArrowRight, CheckIcon } from './icons'
import EditableText from './EditableText'
import './ambient.css'

/* Sparse floating particles behind the header — same visual family as
   `screens/components/particle-field.tsx` but self-contained (reads global
   --brand-* tokens rather than the .dice-page-scoped ones), so it works
   correctly at the top of the page, outside the dice/cards screens. */
function HeaderParticles({ count = 10 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        size: 2 + Math.random() * 3,
        delay: Math.round(Math.random() * 8 * 10) / 10,
        duration: 6 + Math.random() * 5,
        driftX: Math.round((Math.random() - 0.5) * 40),
      })),
    [count],
  )

  return (
    <div className="header-particle-field" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="header-particle"
          style={{
            left: `${p.left}%`,
            bottom: '6%',
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // @ts-expect-error custom property consumed by keyframes
            '--drift-x': `${p.driftX}px`,
          }}
        />
      ))}
    </div>
  )
}

/*
  Tall hero-style banner: logo large and centered, step chips below it,
  lang-switch and back button tucked in the top corners.
  Always horizontal — never a sidebar. Same layout on mobile and desktop;
  desktop simply gets more horizontal breathing room.
*/
type Props = {
  brand: Brand
  lang: Lang
  onLang: (l: Lang) => void
  onBack: () => void
  canBack: boolean
  activeStep: 1 | 2 | 3
  tagline: string
  /** Admin-only: makes the tagline inline-editable, matching the rest of
      the screens' click-to-edit fields. */
  editable?: boolean
  onEditTagline?: (value: string) => void
}

const STEP_KEYS = ['stepBuy', 'stepScan', 'stepWin'] as const

export default function CampaignHeader({
  brand,
  lang,
  onLang,
  onBack,
  canBack,
  activeStep,
  tagline,
  editable = false,
  onEditTagline,
}: Props) {
  const rtl = lang === 'ar'
  const Back = rtl ? ArrowRight : ArrowLeft

  return (
    <header
      className="relative isolate w-full overflow-hidden text-white"
      style={{ background: 'var(--brand-primary)' }}
    >
      {/* Optional hero photo — sits behind everything else in the header,
          with a brand-primary gradient scrim so the logo/text/step chips
          stay legible over any image. Falls back to the flat brand-primary
          background above when no hero image is set (today's default). */}
      {brand.heroImageUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${brand.heroImageUrl})` }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--brand-primary) 88%, transparent), color-mix(in srgb, var(--brand-primary) 70%, transparent))' }}
          />
        </div>
      )}

      {/* ambient glow — breathes gently so the header feels alive rather than static */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'var(--brand-secondary)' }}
        animate={{ opacity: [0.18, 0.28, 0.18], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'var(--brand-accent)' }}
        animate={{ opacity: [0.1, 0.18, 0.1], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <HeaderParticles />

      {/* Top bar — lang switch left, back right (or flipped in RTL) */}
      <div className="relative flex items-center justify-between px-5 pt-4 sm:px-8">
        <div className="inline-flex rounded-[10px] border border-white/15 p-0.5 text-[13px]">
          <button
            onClick={() => onLang('fr')}
            className={`rounded-[7px] px-2.5 py-1 font-medium transition ${lang === 'fr' ? 'bg-white text-[color:var(--brand-primary)]' : 'text-white/70 hover:text-white'}`}
          >
            FR
          </button>
          <button
            onClick={() => onLang('ar')}
            className={`rounded-[7px] px-2.5 py-1 font-medium transition ${lang === 'ar' ? 'bg-white text-[color:var(--brand-primary)]' : 'text-white/70 hover:text-white'}`}
          >
            ع
          </button>
        </div>

        <button
          onClick={onBack}
          disabled={!canBack}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/20 px-3 py-1.5 text-[13px] font-medium text-white/85 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Back className="h-4 w-4" />
          {t.back[lang]}
        </button>
      </div>

      {/* Center: logo badge + name + tagline. The badge is always the same
          shape/color treatment (brand-secondary square) — it holds the
          real logo when the company has uploaded one, or a monogram letter
          otherwise. Never a hardcoded image, so this is correct per-company. */}
      <div className="relative flex flex-col items-center gap-3 px-5 py-6 sm:py-8">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <motion.span
              aria-hidden
              className="absolute -inset-2 rounded-[1.4rem]"
              style={{ background: 'var(--brand-secondary)', opacity: 0.35, filter: 'blur(14px)' }}
              animate={{ opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-2xl shadow-lg sm:h-28 sm:w-28"
              style={{ background: 'var(--brand-secondary)' }}
              initial={{ scale: 0.4, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
              whileHover={{ rotate: [-2, 2, 0], transition: { duration: 0.4 } }}
            >
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="h-full w-full object-contain p-2.5" />
              ) : (
                <span
                  className="text-[42px] font-bold sm:text-[48px]"
                  style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-display)' }}
                  aria-hidden={!!brand.name}
                >
                  {brand.name?.trim()?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </motion.span>
          </div>
          <span
            className="text-[26px] font-bold tracking-tight text-white sm:text-[30px]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {brand.name}
          </span>
        </div>


        <EditableText
          as="p"
          className="mt-1 max-w-xs text-center text-[14px] leading-snug text-white/75 sm:max-w-sm sm:text-[15px]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
          editable={editable}
          displayValue={tagline}
          onCommit={onEditTagline}
          accentColor="rgba(255,255,255,0.9)"
        />
      </div>

      {/* Step progress chips */}
      <div className="relative flex items-center justify-center gap-2 pb-5 sm:gap-4">
        {STEP_KEYS.map((key, i) => {
          const step = (i + 1) as 1 | 2 | 3 | 4 | 5
          const active = step === activeStep
          const done = step < activeStep
          return (
            <div key={key} className="flex items-center gap-2">
              <motion.div
                className="flex flex-row items-center gap-1.5 rounded-full px-3.5 py-2 transition sm:px-4"
                style={{
                  background: active
                    ? 'var(--brand-secondary)'
                    : done
                    ? 'rgba(255,255,255,0.16)'
                    : 'rgba(255,255,255,0.07)',
                  color: active ? 'var(--brand-primary)' : done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                  boxShadow: active ? '0 8px 20px -6px color-mix(in srgb, var(--brand-secondary) 70%, transparent)' : undefined,
                }}
                animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
              >
                {done ? (
                  <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="text-[11px] font-bold tabular-nums">{STEP_LABELS[i]}</span>
                )}
                <span
                  className="text-[12px] font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t[key][lang]}
                </span>
              </motion.div>
              {i < 2 && <span className="text-white/20 text-[18px]">›</span>}
            </div>
          )
        })}
      </div>
    </header>
  )
}
