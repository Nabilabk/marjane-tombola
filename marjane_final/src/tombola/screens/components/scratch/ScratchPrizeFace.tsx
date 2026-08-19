import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { REVEAL_ANIM_MS } from './ScratchFoilLayer'
import type { ScratchCardCopy, ScratchCardTheme, ScratchPrize } from './types'

/*
  The prize content sitting under the foil — always mounted (so the layout
  never jumps when the foil clears), just visually hidden until `revealed`.
  Win/lose styling and the reveal-animation flourish (shine / confetti /
  simple) all read purely from `theme`/`prize` — no brand ever hardcoded
  here, matching every other campaign-driven screen in this app.

  `revealed` flips at the same instant the foil starts fading (see
  ScratchCard3D's `revealing` state) and this content's own fade-in runs
  over the same REVEAL_ANIM_MS the foil uses — a real crossfade, not a
  pop-in after the foil finishes.
*/

function ConfettiBurst({ colors }: { colors: ScratchCardTheme['colors'] }) {
  const pieces = useMemo(() => {
    const palette = [colors.primary, colors.secondary, colors.accent]
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4
      const distance = 46 + Math.random() * 34
      return {
        id: i,
        color: palette[i % palette.length],
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate: Math.random() * 360,
        size: 5 + Math.random() * 5,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.primary, colors.secondary, colors.accent])

  return (
    <div className="scratch-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="scratch-confetti-piece"
          style={{ background: p.color, width: p.size, height: p.size * 2.2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 1 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

export default function ScratchPrizeFace({
  theme,
  prize,
  copy,
  revealed,
}: {
  theme: ScratchCardTheme
  prize: ScratchPrize
  copy: ScratchCardCopy
  revealed: boolean
}) {
  const won = prize.amount > 0

  return (
    <div className="scratch-prize-face">
      {theme.productImageUrl && won && (
        <img src={theme.productImageUrl} alt="" className="scratch-prize-image" aria-hidden="true" />
      )}

      <AnimatePresence>
        {revealed && theme.revealAnimation === 'shine' && (
          <motion.div
            className="scratch-shine"
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: '120%', opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
        {revealed && won && theme.revealAnimation === 'confettiBurst' && <ConfettiBurst colors={theme.colors} />}
      </AnimatePresence>

      <motion.div
        className="scratch-prize-content"
        initial={false}
        animate={revealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 6 }}
        transition={
          theme.revealAnimation === 'simple'
            ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
            : { duration: REVEAL_ANIM_MS / 1000, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {won ? (
          <>
            <div className="scratch-prize-amount" style={{ color: theme.colors.primary }}>
              <span>{prize.amount}</span>
              <span className="scratch-prize-currency">{copy.currencyLabel}</span>
            </div>
            <div className="scratch-prize-label">{copy.winLabel}</div>
          </>
        ) : (
          <div className="scratch-prize-label scratch-prize-label--lose">{copy.loseLabel}</div>
        )}
      </motion.div>
    </div>
  )
}
