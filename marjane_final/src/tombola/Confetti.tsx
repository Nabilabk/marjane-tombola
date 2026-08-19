import { useEffect, useRef } from 'react'

/*
  Canvas-based confetti rain — 120 pieces in brand colors, varied shapes,
  continuous physics loop. Pointer-events off, purely decorative.
*/

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotSpeed: number
  shape: 'rect' | 'circle' | 'ribbon'
  wobble: number
  wobbleSpeed: number
  wobbleOffset: number
}

const COLORS = [
  '#F5A623', // brand secondary (gold)
  '#F27C38', // brand accent (orange)
  '#0C2340', // brand primary (navy)
  '#FFD166', // light gold
  '#FF6B35', // bright orange
  '#ffffff',  // white
]

function makePiece(canvasW: number, fromTop: boolean): Piece {
  return {
    x: Math.random() * canvasW,
    y: fromTop ? Math.random() * -200 - 10 : Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 1.2 + Math.random() * 2.2,
    size: 5 + Math.random() * 11,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.12,
    shape: (['rect', 'circle', 'ribbon'] as const)[Math.floor(Math.random() * 3)],
    wobble: 0,
    wobbleSpeed: 0.03 + Math.random() * 0.04,
    wobbleOffset: Math.random() * Math.PI * 2,
  }
}

export default function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 110
    const pieces: Piece[] = Array.from({ length: COUNT }, () =>
      makePiece(canvas.width, false)
    )

    const draw = () => {
      t += 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of pieces) {
        p.wobble = Math.sin(t * p.wobbleSpeed + p.wobbleOffset) * 18
        p.x += p.vx + Math.cos(t * p.wobbleSpeed + p.wobbleOffset) * 0.4
        p.y += p.vy
        p.rotation += p.rotSpeed

        ctx.save()
        ctx.translate(p.x + p.wobble, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = 0.82

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.fill()
        } else if (p.shape === 'ribbon') {
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 5, p.size, p.size / 2.5)
        } else {
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55)
        }

        ctx.restore()

        // reset when off bottom
        if (p.y > canvas.height + 30) {
          const fresh = makePiece(canvas.width, true)
          Object.assign(p, fresh)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
