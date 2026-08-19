import { useId } from 'react'
import { motion } from 'framer-motion'
import { computeWedgeAngles } from './wheelGeometry'
import type { WheelTheme } from './wheelTheme'

type WheelProps = {
  prizes: number[]
  rotation: number
  spinning: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Wheel design — rim/pointer style, shadow, hub logo. Optional so every
   *  existing caller (and the admin's other previews) keeps working
   *  unstyled, same as ScratchCard3D's `theme` isn't optional but every
   *  caller already has one to pass — Wheel predates WheelTheme, so this
   *  stays optional and falls back to the original look. */
  theme?: WheelTheme
}

const CX = 150
const CY = 150
const R = 140

// Mirrors ScratchCardFallback's SHADOW_BY_INTENSITY — same 4 levels, tuned
// for a drop-shadow filter on a disc instead of a boxShadow on a rectangle.
const SHADOW_BY_INTENSITY: Record<NonNullable<WheelTheme['shadowIntensity']>, string> = {
  none: 'none',
  soft: 'drop-shadow(0 10px 18px rgba(var(--dice-shadow-color), 0.18))',
  medium: 'drop-shadow(0 18px 30px rgba(var(--dice-shadow-color), 0.28))',
  strong: 'drop-shadow(0 26px 42px rgba(var(--dice-shadow-color), 0.4))',
}

const RIM_STROKE: Record<NonNullable<WheelTheme['rimStyle']>, (accent: string) => string> = {
  classic: () => 'var(--dice-gold)',
  minimal: () => 'rgba(23, 20, 15, 0.18)',
  neon: (accent) => accent,
}

function toRad(deg: number) {
  return ((deg - 90) * Math.PI) / 180
}

/** SVG path for one wedge of the wheel, `startAngle`/`endAngle` in degrees, 0 = top, clockwise. */
function wedgePath(startAngle: number, endAngle: number) {
  const start = { x: CX + R * Math.cos(toRad(startAngle)), y: CY + R * Math.sin(toRad(startAngle)) }
  const end = { x: CX + R * Math.cos(toRad(endAngle)), y: CY + R * Math.sin(toRad(endAngle)) }
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

// Three distinct spin "feels", selectable per-campaign in the Wheel design
// panel — smooth is the original single-ease deceleration; bouncy is a
// spring so the disc overshoots and settles back, mechanical is a sharper
// accelerate/decelerate that reads as more "clockwork" than "silky".
const SPIN_TRANSITION: Record<NonNullable<WheelTheme['spinStyle']>, object> = {
  smooth: { duration: 4, ease: [0.12, 0.8, 0.18, 1] },
  bouncy: { type: 'spring', stiffness: 40, damping: 8, mass: 1.1 },
  mechanical: { duration: 3.6, ease: [0.65, 0, 0.35, 1] },
}

/**
 * Classic prize wheel — SVG wedges colored from the brand palette, spun via
 * a Framer Motion rotation on the whole disc. The pointer is fixed (doesn't
 * rotate); `rotation` (owned by WheelScreen) is the only thing that moves,
 * so landing on a specific prize is just picking the right target angle.
 */
export default function Wheel({ prizes, rotation, spinning, size = 'lg', theme }: WheelProps) {
  // Unique per instance — two Wheels can be on screen at once (e.g. the
  // admin's WheelEditor live preview), and duplicate SVG element IDs would
  // make `url(#...)` resolution ambiguous between them.
  const hubClipId = useId()
  const n = Math.max(prizes.length, 1)
  const wedges = computeWedgeAngles(n)

  const rimStyle = theme?.rimStyle ?? 'classic'
  const pointerStyle = theme?.pointerStyle ?? 'classic'
  const spinStyle = theme?.spinStyle ?? 'smooth'
  const shadowIntensity = theme?.shadowIntensity ?? 'medium'
  const accent = theme?.colors.accent || 'var(--brand-accent)'
  const rimColor = RIM_STROKE[rimStyle](accent)

  return (
    <div className={`wheel-viewport wheel-viewport--${size}`}>
      <div
        className={`wheel-pointer wheel-pointer--${pointerStyle}`}
        aria-hidden="true"
        style={pointerStyle === 'classic' ? undefined : { borderTopColor: accent, background: accent }}
      />
      <div className="wheel-glow" aria-hidden="true" />
      <motion.svg
        viewBox="0 0 300 300"
        className="wheel-disc"
        style={{ filter: SHADOW_BY_INTENSITY[shadowIntensity] }}
        animate={{ rotate: rotation }}
        transition={spinning ? SPIN_TRANSITION[spinStyle] : { duration: 0 }}
      >
        <circle
          cx={CX}
          cy={CY}
          r={R + 8}
          className="wheel-rim"
          style={{
            stroke: rimColor,
            strokeWidth: rimStyle === 'minimal' ? 2 : rimStyle === 'neon' ? 3 : 4,
            filter: rimStyle === 'neon' ? `drop-shadow(0 0 6px ${accent})` : undefined,
          }}
        />
        {prizes.map((value, i) => {
          const { start, end, mid, size } = wedges[i]
          const even = i % 2 === 0
          const labelR = R * 0.62
          const lx = CX + labelR * Math.cos(toRad(mid))
          const ly = CY + labelR * Math.sin(toRad(mid))
          // A slice this thin can't fit its own label without overlapping
          // its neighbors — the rare, low-odds "1%" segments end up here.
          const showLabel = size >= 12
          return (
            <g key={i}>
              <path
                d={wedgePath(start, end)}
                fill={
                  even
                    ? 'color-mix(in srgb, var(--brand-primary) 92%, white)'
                    : 'color-mix(in srgb, var(--brand-secondary) 88%, white)'
                }
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1.5}
              />
              {showLabel && (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${lx}, ${ly})`}
                  className="wheel-label"
                  fill={even ? '#fff' : 'var(--brand-primary)'}
                >
                  {value > 0 ? value : '—'}
                </text>
              )}
            </g>
          )
        })}
        <circle
          cx={CX}
          cy={CY}
          r={30}
          className="wheel-hub"
          style={{
            stroke: rimColor,
            filter: rimStyle === 'neon' ? `drop-shadow(0 0 5px ${accent})` : undefined,
          }}
        />
        {theme?.logoUrl && (
          <>
            <clipPath id={hubClipId}>
              <circle cx={CX} cy={CY} r={24} />
            </clipPath>
            <image
              href={theme.logoUrl}
              x={CX - 24}
              y={CY - 24}
              width={48}
              height={48}
              clipPath={`url(#${hubClipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </>
        )}
      </motion.svg>
    </div>
  )
}
