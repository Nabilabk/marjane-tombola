/*
  Subtle, sparse geometric confetti — small 6-10px shapes in brand colors at
  low opacity, positioned only at the periphery of the content. Never covers the
  center, never CSS-ribbon spam. Pointer-events off so it's purely decorative.
*/
type Shape = {
  top: string
  left?: string
  right?: string
  kind: 'square' | 'circle' | 'triangle'
  size: number
  color: string
  opacity: number
  rotate: number
  delay: number
}

const SHAPES: Shape[] = [
  { top: '12%', left: '5%', kind: 'circle', size: 8, color: 'var(--brand-accent)', opacity: 0.55, rotate: 0, delay: 0 },
  { top: '26%', left: '9%', kind: 'square', size: 7, color: 'var(--brand-primary)', opacity: 0.45, rotate: 20, delay: 1.4 },
  { top: '68%', left: '4%', kind: 'triangle', size: 9, color: 'var(--brand-secondary)', opacity: 0.4, rotate: 12, delay: 0.7 },
  { top: '82%', left: '11%', kind: 'circle', size: 6, color: 'var(--brand-primary)', opacity: 0.5, rotate: 0, delay: 2.1 },
  { top: '16%', right: '6%', kind: 'square', size: 8, color: 'var(--brand-secondary)', opacity: 0.42, rotate: 35, delay: 1.1 },
  { top: '40%', right: '4%', kind: 'circle', size: 7, color: 'var(--brand-accent)', opacity: 0.55, rotate: 0, delay: 0.4 },
  { top: '73%', right: '8%', kind: 'triangle', size: 10, color: 'var(--brand-accent)', opacity: 0.5, rotate: -18, delay: 1.8 },
  { top: '90%', right: '5%', kind: 'square', size: 6, color: 'var(--brand-primary)', opacity: 0.4, rotate: 45, delay: 2.6 },
]

export default function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SHAPES.map((s, i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          top: s.top,
          left: s.left,
          right: s.right,
          width: s.size,
          height: s.size,
          opacity: s.opacity,
          // @ts-expect-error custom prop for keyframe
          '--r': `${s.rotate}deg`,
          transform: `rotate(${s.rotate}deg)`,
          animationDelay: `${s.delay}s`,
        }
        if (s.kind === 'circle') {
          return <span key={i} className="float-soft" style={{ ...style, background: s.color, borderRadius: '50%' }} />
        }
        if (s.kind === 'square') {
          return <span key={i} className="float-soft" style={{ ...style, background: s.color, borderRadius: 2 }} />
        }
        return (
          <span
            key={i}
            className="float-soft"
            style={{
              ...style,
              width: 0,
              height: 0,
              background: 'transparent',
              borderLeft: `${s.size / 2}px solid transparent`,
              borderRight: `${s.size / 2}px solid transparent`,
              borderBottom: `${s.size}px solid ${s.color}`,
            }}
          />
        )
      })}
    </div>
  )
}
