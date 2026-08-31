import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/* Staggered entrance container — children fade + slide up in sequence. */
export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function Item({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  )
}

/* Shared screen title block — the step label + main title that sits under the banner.
   `label`/`title` accept ReactNode (not just string) so the admin preview can pass an
   inline-editable element in place of plain text — rendering is identical either way. */
export function ScreenTitle({ label, title }: { label: ReactNode; title: ReactNode }) {
  return (
    <div className="mb-8">
      <div
        className="mb-3 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--brand-primary)' }}
      >
        <motion.span
          className="h-2 w-2 rounded-full"
          style={{ background: 'var(--brand-secondary)' }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {label}
      </div>
      <h1
        className="text-[32px] leading-[1.04] sm:text-[44px]"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}
      >
        {title}
      </h1>
    </div>
  )
}

/* Primary CTA — chunky rounded-rectangle "arcade button" (not a pill),
   mirroring the `.dice-btn` treatment from dice-theme.css so every screen's
   main action reads as the same "big game button" family. Radius follows
   the campaign's own corner-radius setting (var(--radius)) instead of a
   hardcoded pill, and the bottom "ledge" shadow gives it the same
   pressable, physical feel as the dice/cards buttons.

   Look + size come from the --btn-* custom properties that
   `applyCampaignTheme` (engine/theme.ts) derives from the Theme editor's
   "Buttons" panel (style: solid/outline/soft, size: sm/md/lg) — the
   fallbacks below reproduce the old hardcoded solid look for any embed
   that renders this without going through applyCampaignTheme first. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={
        disabled
          ? undefined
          : {
              y: -2,
              boxShadow:
                'var(--btn-shadow-hover, 0 4px 0 0 color-mix(in srgb, var(--brand-primary) 70%, black), 0 18px 36px -10px color-mix(in srgb, var(--brand-primary) 60%, transparent))',
            }
      }
      whileTap={disabled ? undefined : { y: 3, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      className="inline-flex w-full items-center justify-center gap-2 font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      style={{
        borderRadius: 'calc(var(--radius, 14px) + 4px)',
        padding: 'var(--btn-py, 0.875rem) var(--btn-px, 1.75rem)',
        fontSize: 'var(--btn-font, 15px)',
        color: 'var(--btn-color, #fff)',
        border: 'var(--btn-border, none)',
        background:
          'var(--btn-bg, linear-gradient(155deg, color-mix(in srgb, var(--brand-primary) 85%, white 15%), var(--brand-primary)))',
        boxShadow:
          'var(--btn-shadow, 0 4px 0 0 color-mix(in srgb, var(--brand-primary) 70%, black), 0 14px 28px -10px color-mix(in srgb, var(--brand-primary) 48%, transparent), inset 0 1px 0 rgba(255,255,255,0.3))',
      }}
    >
      {children}
    </motion.button>
  )
}

/* Secondary action — always the same translucent "ghost" treatment (the
   Theme editor's buttonStyle choices are for the primary CTA only), but
   still follows the buttonSize setting so it stays the same height as the
   PrimaryButton it's usually paired with. */
export function GhostButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ y: 2, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      className="inline-flex items-center justify-center gap-2 border font-semibold backdrop-blur-md"
      style={{
        borderRadius: 'calc(var(--radius, 14px) + 4px)',
        padding: 'var(--btn-py, 0.875rem) var(--btn-px, 1.75rem)',
        fontSize: 'var(--btn-font, 15px)',
        borderColor: 'var(--hairline)',
        color: 'var(--ink)',
        background: 'color-mix(in srgb, var(--card) 55%, transparent)',
        boxShadow: '0 3px 0 0 color-mix(in srgb, var(--hairline) 160%, transparent)',
      }}
    >
      {children}
    </motion.button>
  )
}

/* Glass info card — translucent, blurred, soft shadow, echoes the
   `.dice-result-card` look so Form/Scan/Result share the same "floating
   panel" language as Dice/Cards. */
export function InfoCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[1.75rem] border p-5 backdrop-blur-xl ${className}`}
      style={{
        background: 'color-mix(in srgb, var(--card) 74%, transparent)',
        borderColor: 'color-mix(in srgb, var(--hairline) 160%, transparent)',
        boxShadow: '0 20px 44px -24px rgba(0,0,0,0.22)',
      }}
    >
      {children}
    </div>
  )
}
