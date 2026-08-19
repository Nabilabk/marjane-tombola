import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import type { CardsTheme } from './cardsTheme'
import { resolveGlowColor } from './cardsTheme'

type DiceProps = {
  value: number | null
  rolling: boolean
  onRollComplete?: () => void
  size?: 'sm' | 'md' | 'lg'
  /** Dice + Cards design (cube style, glow color) — see
   *  campaignToCardsTheme in engine/theme.ts. Optional, falls back to the
   *  original cream cube + gold glow. */
  theme?: CardsTheme
}

// Opposite faces sum to 7, matching a real die: front/back = 1/6,
// right/left = 2/5, top/bottom = 3/4.
const FACES: { num: number; className: string }[] = [
  { num: 1, className: 'dice-face--front' },
  { num: 6, className: 'dice-face--back' },
  { num: 2, className: 'dice-face--right' },
  { num: 5, className: 'dice-face--left' },
  { num: 3, className: 'dice-face--top' },
  { num: 4, className: 'dice-face--bottom' },
]

// Container rotation that brings each numbered face to point at the
// camera. (Same mapping the original component used — only the face
// geometry underneath it changed.)
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 90, y: 0 },
  4: { x: -90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
}

const DOTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
}

function Pips({ num }: { num: number }) {
  return (
    <div className="dice-face-inner">
      {DOTS[num].map(([x, y], i) => (
        <span
          key={i}
          className="dice-pip"
          style={{
            left: `${50 + x * 32}%`,
            top: `${50 + y * 32}%`,
            width: '17%',
            height: '17%',
          }}
        />
      ))}
    </div>
  )
}

// Returns the smallest angle congruent to `target` (mod 360) that is
// >= `current`, so the cube keeps spinning forward into its landing
// instead of snapping backward.
function forwardTarget(current: number, target: number) {
  const base = ((target % 360) + 360) % 360
  const currentMod = ((current % 360) + 360) % 360
  let delta = base - currentMod
  if (delta < 0) delta += 360
  return current + delta
}

export default function Dice({ value, rolling, onRollComplete, size = 'lg', theme }: DiceProps) {
  const diceStyle = theme?.diceStyle ?? 'classic'
  const glowColor = resolveGlowColor(theme?.glowColor ?? 'gold', theme?.colors.accent || 'var(--brand-accent)')
  const tintColor = theme?.colors.primary || 'var(--brand-primary)'
  const rotateX = useMotionValue(-16)
  const rotateY = useMotionValue(28)
  const scale = useMotionValue(1)
  const [shake, setShake] = useState(false)
  const [burst, setBurst] = useState(false)
  const wasRolling = useRef(false)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Idle: gentle continuous spin so the cube always reads as 3D,
  // never a flat static square.
  useEffect(() => {
    if (rolling || reducedMotion.current) return
    const controls = animate(rotateY, rotateY.get() + 360, {
      duration: 16,
      ease: 'linear',
      repeat: Infinity,
    })
    const controlsX = animate(rotateX, [rotateX.get(), rotateX.get() - 10, rotateX.get()], {
      duration: 4.5,
      ease: 'easeInOut',
      repeat: Infinity,
    })
    return () => {
      controls.stop()
      controlsX.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  // Rolling: quick accelerate, then a fast sustained spin until the
  // result arrives.
  useEffect(() => {
    if (!rolling) return
    if (reducedMotion.current) return
    let cancelled = false

    ;(async () => {
      await animate(rotateY, rotateY.get() + 260, {
        duration: 0.32,
        ease: [0.4, 0, 1, 1],
      }).finished
      if (cancelled) return
      animate(rotateY, rotateY.get() + 900, { duration: 0.85, ease: 'linear', repeat: Infinity })
      animate(rotateX, rotateX.get() + 620, { duration: 1.15, ease: 'linear', repeat: Infinity })
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling])

  // Landing: the moment `rolling` flips false and a value is ready,
  // decelerate into the correct face with a small bounce, plus a
  // screen shake and particle burst.
  useEffect(() => {
    const justLanded = wasRolling.current && !rolling && value !== null
    wasRolling.current = rolling

    if (!justLanded || value === null) return

    const target = FACE_ROTATION[value]
    const targetY = forwardTarget(rotateY.get(), target.y)
    const targetX = forwardTarget(rotateX.get(), target.x)

    if (reducedMotion.current) {
      rotateX.set(target.x)
      rotateY.set(target.y)
      onRollComplete?.()
      return
    }

    animate(rotateY, [rotateY.get(), targetY + 12, targetY - 4, targetY], {
      duration: 0.85,
      times: [0, 0.55, 0.8, 1],
      ease: ['easeIn', 'easeOut', 'easeOut'],
    })
    animate(rotateX, [rotateX.get(), targetX - 8, targetX + 3, targetX], {
      duration: 0.85,
      times: [0, 0.55, 0.8, 1],
      ease: ['easeIn', 'easeOut', 'easeOut'],
    })
    animate(scale, [1, 0.93, 1.06, 1], { duration: 0.75, times: [0, 0.5, 0.72, 1] })

    setShake(true)
    setBurst(true)
    const t1 = setTimeout(() => setShake(false), 420)
    const t2 = setTimeout(() => setBurst(false), 700)

    onRollComplete?.()

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling, value])

  return (
    <motion.div
      className="dice-stage"
      style={{ '--dice-gold': glowColor, '--dice-tint': tintColor } as CSSProperties}
      animate={
        shake
          ? { x: [0, -7, 7, -5, 5, -2, 0], y: [0, 2, -2, 1, 0] }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.42, ease: 'easeOut' }}
    >
      <div className="dice-stage-glow" style={{ opacity: rolling ? 0.9 : 0.6 }} />

      <motion.div
        animate={{ y: rolling ? 0 : [0, -14, 0] }}
        transition={
          rolling
            ? { duration: 0.2 }
            : { duration: 3.4, ease: 'easeInOut', repeat: Infinity }
        }
      >
        <div className={`dice-cube-viewport dice-cube-viewport--${size}`}>
          <motion.div
            className={`dice-cube dice-cube--${diceStyle}`}
            style={{ rotateX, rotateY, scale }}
          >
            {FACES.map(({ num, className }) => (
              <div key={num} className={`dice-face ${className}`}>
                <Pips num={num} />
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {burst && (
          <div className="dice-burst" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.span
                key={i}
                className="dice-burst-dot"
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / 10) * Math.PI * 2) * 90,
                  y: Math.sin((i / 10) * Math.PI * 2) * 90,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
