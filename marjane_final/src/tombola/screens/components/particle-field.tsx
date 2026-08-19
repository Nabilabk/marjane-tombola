import { useMemo } from 'react'

/**
 * Purely decorative floating light particles behind the dice.
 * aria-hidden — carries no information, so it's invisible to
 * assistive tech and safe to skip under prefers-reduced-motion
 * (handled in dice-theme.css).
 */
export default function ParticleField({ count = 14 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.round(Math.random() * 100),
        size: 2 + Math.random() * 4,
        delay: Math.round(Math.random() * 9 * 10) / 10,
        duration: 7 + Math.random() * 6,
        driftX: Math.round((Math.random() - 0.5) * 60),
      })),
    [count]
  )

  return (
    <div className="dice-particle-field" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="dice-particle"
          style={{
            left: `${p.left}%`,
            bottom: '10%',
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
