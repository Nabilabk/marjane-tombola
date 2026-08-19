import { forwardRef, useEffect, useRef } from 'react'
import { motion, animate } from 'framer-motion'
import type { CardBackPattern } from './cardsTheme'
import { resolveGlowColor, type CardsTheme } from './cardsTheme'

// Mirrors ScratchCardFallback's SHADOW_BY_INTENSITY, tuned for the card's
// existing multi-layer boxShadow (a base "ledge" shadow this only scales).
const SHADOW_SCALE: Record<NonNullable<CardsTheme['shadowIntensity']>, number> = {
  none: 0,
  soft: 0.6,
  medium: 1,
  strong: 1.5,
}

type CardProps = {
  value: number
  opened: boolean
  canPick: boolean
  onClick: () => void
  isLastReveal?: boolean
  /** Per-company brand logo for the card-back ornament. Falls back to a
      plain decorative mark (not a hardcoded file) when a company hasn't
      set one, so this never shows another company's logo. */
  logoUrl?: string
  /** Dice + Cards design (back pattern, shadow, glow color) — see
   *  campaignToCardsTheme in engine/theme.ts. Optional, falls back to the
   *  original ornament back + gold glow. */
  theme?: CardsTheme
}

const Card = forwardRef<HTMLButtonElement, CardProps>(function Card(
  // isLastReveal is part of the public prop contract (callers may pass it)
  // but nothing in this component currently reads it.
  { value, opened, canPick, onClick, isLastReveal: _isLastReveal = false, logoUrl, theme },
  ref
) {
  const backPattern: CardBackPattern = theme?.cardBackPattern ?? 'ornament'
  const glowColor = resolveGlowColor(theme?.glowColor ?? 'gold', theme?.colors.accent || 'var(--brand-accent)')
  const shadowScale = SHADOW_SCALE[theme?.shadowIntensity ?? 'medium']
  const cardRef = useRef<HTMLDivElement>(null)
  const wasOpened = useRef(false)

  useEffect(() => {
    if (opened && !wasOpened.current) {
      wasOpened.current = true
      const el = cardRef.current
      if (!el) return

      // Physical flip animation with momentum
      animate(
        el,
        {
          rotateY: [0, 110, 180, 175, 180],
          scale: [1, 1.06, 1.03, 1, 1],
          translateZ: [0, 30, 10, 0, 0],
        },
        {
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
        }
      )
    }
  }, [opened])

  const isWinning = opened && value > 0

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={!canPick}
      onClick={onClick}
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
        // Scales down on narrow phones (was a fixed 96x132, which made the
        // 3x3 grid + header tall enough to force a scroll) while staying
        // at the original size from small tablets up.
        width: 'clamp(72px, 21vw, 96px)',
        height: 'clamp(99px, 29vw, 132px)',
      }}
      className={`
        relative
        focus:outline-none
        ${canPick ? 'cursor-pointer' : 'cursor-default'}
      `}
      animate={
        canPick && !opened
          ? {
              y: [0, -8, 0, -4, 0],
              transition: {
                duration: 3.4,
                ease: 'easeInOut',
                repeat: Infinity,
                times: [0, 0.3, 0.6, 0.8, 1],
              },
            }
          : { y: 0 }
      }
      whileHover={
        canPick && !opened
          ? {
              y: -12,
              scale: 1.04,
              transition: { type: 'spring', stiffness: 300, damping: 18 },
            }
          : undefined
      }
      whileTap={canPick && !opened ? { scale: 0.96, transition: { duration: 0.1 } } : undefined}
    >
      {/* Glow behind winning cards — a celebratory effect, so its color
          follows theme.glowColor but its presence doesn't depend on
          shadowIntensity (that only scales the card's own depth shadows,
          below). */}
      {opened && value > 0 && (
        <motion.div
          className="absolute -inset-3 rounded-2xl pointer-events-none"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
          style={{
            background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 72%)`,
            opacity: 0.45,
            filter: 'blur(12px)',
          }}
        />
      )}

      {/* Card container */}
      <div
        ref={cardRef}
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          borderRadius: '1rem',
        }}
      >
        {/* ===== BACK (face down) ===== */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            borderRadius: '1rem',
            background: `
              linear-gradient(
                155deg,
                color-mix(in srgb, var(--brand-primary) 94%, white) 0%,
                var(--brand-primary) 45%,
                color-mix(in srgb, var(--brand-primary) 82%, black) 100%
              )
            `,
            boxShadow: `
              inset 0 1px 1px rgba(255, 255, 255, 0.35),
              inset 0 ${-4 * shadowScale}px ${10 * shadowScale}px rgba(0, 0, 0, ${0.2 * shadowScale}),
              0 ${6 * shadowScale}px ${18 * shadowScale}px -6px rgba(23, 20, 15, ${0.28 * shadowScale})
            `,
            border: '1.5px solid color-mix(in srgb, var(--brand-primary) 60%, black)',
          }}
        >
          {/* Decorative card back — pattern picked by theme.cardBackPattern */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            {(backPattern === 'ornament' || backPattern === 'diamond') && (
              <>
                <div className="absolute inset-[6px] rounded-[12px]" style={{ border: '1px solid rgba(255,255,255,.18)' }} />
                <div className="absolute inset-[12px] rounded-[10px]" style={{ border: '1px solid rgba(255,255,255,.08)' }} />
              </>
            )}
            {backPattern === 'minimal' && (
              <div className="absolute inset-[8px] rounded-[11px]" style={{ border: '1px solid rgba(255,255,255,.14)' }} />
            )}

            {/* Center emblem — sized per pattern: a small circle for
                ornament/diamond/minimal, or a large near-full-bleed mark
                for logoFocus. */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                style={{
                  width: backPattern === 'logoFocus' ? '72%' : 64,
                  height: backPattern === 'logoFocus' ? '72%' : 64,
                  borderRadius: backPattern === 'logoFocus' ? '18%' : '50%',
                  border: backPattern === 'minimal' ? 'none' : '2px solid rgba(255,255,255,.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: backPattern === 'minimal' ? 'none' : '0 0 18px rgba(255,255,255,.05) inset',
                  overflow: 'hidden',
                  background: backPattern === 'minimal' ? 'transparent' : 'rgba(255,255,255,.06)',
                }}
              >
                {/* The company's own logo when set, otherwise a plain
                    decorative mark (never another company's logo file). */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      style={{
                        width: '90%',
                        height: '68%',
                        objectFit: 'contain',
                        filter: 'brightness(0) invert(1) opacity(0.85)',
                      }}
                    />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.55 }}>
                      <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill="white" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {backPattern === 'ornament' && (
              <>
                {[
                  { top: 18, left: 18 },
                  { top: 18, right: 18 },
                  { bottom: 18, left: 18 },
                  { bottom: 18, right: 18 },
                ].map((p, i) => (
                  <div
                    key={i}
                    style={{ position: 'absolute', width: 10, height: 10, transform: 'rotate(45deg)', background: 'rgba(255,255,255,.22)', ...p }}
                  />
                ))}
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: 0.06,
                    backgroundImage: 'linear-gradient(45deg, white 1px, transparent 1px), linear-gradient(-45deg, white 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />
              </>
            )}

            {backPattern === 'diamond' && (
              <div
                className="absolute inset-0"
                style={{
                  opacity: 0.14,
                  backgroundImage: 'linear-gradient(45deg, white 1px, transparent 1px), linear-gradient(-45deg, white 1px, transparent 1px)',
                  backgroundSize: '13px 13px',
                }}
              />
            )}
          </div>
          {/* Glossy reflection overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: '1rem',
              background: `
                linear-gradient(
                  135deg,
                  rgba(255,255,255,0.25) 0%,
                  rgba(255,255,255,0.08) 30%,
                  transparent 50%
                )
              `,
            }}
          />
        </div>

        {/* ===== FRONT (revealed) ===== */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '1rem',
            background: `
              linear-gradient(
                155deg,
                #ffffff 0%,
                #fbfaf7 45%,
                #f4f1ea 100%
              )
            `,
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.9),
              inset 0 ${-6 * shadowScale}px ${14 * shadowScale}px rgba(23, 20, 15, ${0.08 * shadowScale}),
              0 ${8 * shadowScale}px ${22 * shadowScale}px -8px rgba(23, 20, 15, ${0.2 * shadowScale}),
              ${isWinning ? `0 0 24px -4px ${glowColor},` : ''}
              0 1px 0 rgba(23, 20, 15, 0.04)
            `,
            border: '1.5px solid rgba(255,255,255,0.5)',
          }}
        >
          {/* Prize value */}
          <motion.span
            className="text-[28px] sm:text-[32px] font-bold tracking-tight"
            style={{
              fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif",
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: isWinning ? 'var(--brand-primary)' : 'var(--dice-ink-faint, rgba(23,20,15,0.36))',
              textShadow: isWinning
                ? `0 0 20px color-mix(in srgb, ${glowColor} 35%, transparent)`
                : 'none',
            }}
            initial={opened ? { opacity: 0, scale: 0.5, y: 8, rotate: -4 } : { opacity: 0 }}
            animate={
              opened
                ? {
                    opacity: 1,
                    scale: [0.5, 1.12, 0.96, 1],
                    y: [8, -3, 1, 0],
                    rotate: [-4, 2, -1, 0],
                  }
                : { opacity: 0 }
            }
            transition={{
              delay: 0.15,
              duration: 0.55,
              ease: [0.34, 1.4, 0.64, 1],
            }}
          >
            {value === 0 ? '—' : value}
          </motion.span>

          {/* "DH" label on winning cards */}
          {isWinning && (
            <motion.span
              className="text-xs font-medium"
              style={{
                color: 'var(--dice-ink-faint, rgba(23,20,15,0.36))',
                marginTop: '1px',
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              DH
            </motion.span>
          )}

          {/* Glossy reflection overlay for front */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: '1rem',
              background: `
                linear-gradient(
                  135deg,
                  rgba(255,255,255,0.5) 0%,
                  rgba(255,255,255,0.1) 30%,
                  transparent 55%
                )
              `,
            }}
          />
        </div>
      </div>
    </motion.button>
  )
})

export default Card
