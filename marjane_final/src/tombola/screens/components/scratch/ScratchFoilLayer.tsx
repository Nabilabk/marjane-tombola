import { useEffect, useRef } from 'react'
import { paintFoil } from './scratchFoilPresets'
import type { ScratchCardColors, ScratchFoilStyle } from './types'

/*
  The interactive scratch surface — a plain DOM <canvas> stacked on top of
  the 3D card body (see ScratchCard3D.tsx), erased with
  `globalCompositeOperation = 'destination-out'` wherever the pointer
  moves. Deliberately NOT a THREE texture: the card's camera never really
  moves (small idle tilt only), so a flat DOM overlay reads as "on the
  card" with no visible seam, while getting rock-solid mouse+touch+pen
  handling for free from React's unified Pointer Events instead of having
  to raycast screen coordinates into UV space every frame.

  This same component is reused unchanged by the WebGL-failure fallback —
  only what's rendered *behind* it (ScratchCardMesh vs ScratchCardFallback)
  differs.
*/

const SAMPLE_SIZE = 32 // downsample resolution for the erased-fraction check — cheap, not per-frame accurate to the pixel, doesn't need to be
const SAMPLE_INTERVAL_MS = 120
// How long the foil takes to dissolve away once the threshold is hit.
// Exported so ScratchPrizeFace can time its own fade-in to match exactly —
// a crossfade only reads as "one smooth reveal" if both halves share a
// duration instead of the content just popping in once the foil is gone.
export const REVEAL_ANIM_MS = 650

export interface ScratchFoilLayerProps {
  foilStyle: ScratchFoilStyle
  colors: ScratchCardColors
  label: string
  /** 0-100 — fraction scratched away before the rest auto-reveals. */
  revealThreshold: number
  /** When true, scratching is disabled entirely (already revealed, or the
   *  screen isn't in a scratchable phase yet). */
  locked: boolean
  onScratchStart?: () => void
  /** Fires the instant the threshold is hit, before the foil starts
   *  fading — the parent uses this to start the prize content's fade-in
   *  in the same frame, so the two animate as one continuous crossfade
   *  instead of "wipe, then pop". */
  onRevealBegin?: () => void
  /** Fires once, after the foil has fully faded away. */
  onRevealed: () => void
}

export default function ScratchFoilLayer({
  foilStyle,
  colors,
  label,
  revealThreshold,
  locked,
  onScratchStart,
  onRevealBegin,
  onRevealed,
}: ScratchFoilLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isScratchingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const hasScratchedRef = useRef(false)
  const revealedRef = useRef(false)
  const lastSampleAtRef = useRef(0)
  const startedRef = useRef(false)

  // Size + paint the foil to match the container, at devicePixelRatio for
  // crisp edges. Only repaints on resize before any scratching has
  // happened — resizing mid-scratch (e.g. an orientation flip) keeps
  // whatever progress the player already made instead of wiping it.
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    sampleCanvasRef.current = document.createElement('canvas')
    sampleCanvasRef.current.width = SAMPLE_SIZE
    sampleCanvasRef.current.height = SAMPLE_SIZE

    const paint = (width: number, height: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      const ctx = canvas.getContext('2d')
      if (ctx) paintFoil(ctx, canvas.width, canvas.height, foilStyle, colors, label)
    }

    const ro = new ResizeObserver((entries) => {
      if (hasScratchedRef.current) return
      const rect = entries[0].contentRect
      if (rect.width > 0 && rect.height > 0) paint(rect.width, rect.height)
    })
    ro.observe(container)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Repaint when the design itself changes (admin editor live preview) —
  // gated so it never fights a play already in progress.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0 || hasScratchedRef.current) return
    const ctx = canvas.getContext('2d')
    if (ctx) paintFoil(ctx, canvas.width, canvas.height, foilStyle, colors, label)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foilStyle, colors.primary, colors.secondary, colors.accent, label])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) canvas.style.pointerEvents = locked ? 'none' : 'auto'
  }, [locked])

  function toCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function eraseSegment(from: { x: number; y: number } | null, to: { x: number; y: number }) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const brush = Math.max(canvas.width, canvas.height) * 0.05

    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brush * 2
    ctx.beginPath()
    if (from) {
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }
    // A dot on top of the stroke so a single tap (no movement) still erases
    // something, and slow drags stay chunky rather than thin.
    ctx.beginPath()
    ctx.arc(to.x, to.y, brush, 0, Math.PI * 2)
    ctx.fill()
  }

  function sampleErasedFraction(): number {
    const canvas = canvasRef.current
    const sample = sampleCanvasRef.current
    if (!canvas || !sample || canvas.width === 0) return 0
    const sctx = sample.getContext('2d')
    if (!sctx) return 0
    sctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    sctx.drawImage(canvas, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const { data } = sctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    let erased = 0
    const total = SAMPLE_SIZE * SAMPLE_SIZE
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 24) erased++
    }
    return (erased / total) * 100
  }

  // A CSS opacity/blur/scale dissolve on the whole canvas element — not
  // another canvas-pixel animation — so it's a true crossfade: the prize
  // content underneath (ScratchPrizeFace) starts fading IN via
  // `onRevealBegin` at the exact same moment and over the exact same
  // duration (REVEAL_ANIM_MS), instead of only appearing once the foil
  // has finished wiping away. Browser-native transitions also run on the
  // compositor, so this stays smooth even on modest phones.
  function playRevealDissolve() {
    const canvas = canvasRef.current
    if (!canvas) {
      onRevealed()
      return
    }
    canvas.style.transition = [
      `opacity ${REVEAL_ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      `filter ${REVEAL_ANIM_MS}ms ease-out`,
      `transform ${REVEAL_ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    ].join(', ')
    // Reflow so the transition actually picks up the change below instead
    // of jumping straight to the end state.
    void canvas.offsetHeight
    canvas.style.opacity = '0'
    canvas.style.filter = 'blur(7px)'
    canvas.style.transform = 'scale(1.06)'

    window.setTimeout(() => {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      onRevealed()
    }, REVEAL_ANIM_MS)
  }

  function maybeCheckThreshold() {
    const now = performance.now()
    if (now - lastSampleAtRef.current < SAMPLE_INTERVAL_MS) return
    lastSampleAtRef.current = now
    if (sampleErasedFraction() >= revealThreshold) {
      revealedRef.current = true
      const canvas = canvasRef.current
      if (canvas) canvas.style.pointerEvents = 'none'
      onRevealBegin?.()
      playRevealDissolve()
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (locked || revealedRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    isScratchingRef.current = true
    hasScratchedRef.current = true
    if (!startedRef.current) {
      startedRef.current = true
      onScratchStart?.()
    }
    const pos = toCanvasPoint(e)
    lastPointRef.current = pos
    eraseSegment(null, pos)
    maybeCheckThreshold()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isScratchingRef.current || revealedRef.current) return
    const pos = toCanvasPoint(e)
    eraseSegment(lastPointRef.current, pos)
    lastPointRef.current = pos
    maybeCheckThreshold()
  }

  function endScratch(e: React.PointerEvent<HTMLCanvasElement>) {
    isScratchingRef.current = false
    lastPointRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer capture already released — safe to ignore */
    }
  }

  return (
    <div ref={containerRef} className="scratch-foil-wrap" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="scratch-foil-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endScratch}
        onPointerLeave={endScratch}
        onPointerCancel={endScratch}
      />
    </div>
  )
}
