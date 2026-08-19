import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import WebGLErrorBoundary from '../WebGLErrorBoundary'
import ScratchCardMesh from './ScratchCardMesh'
import ScratchCardFallback, { SHADOW_BY_INTENSITY } from './ScratchCardFallback'
import ScratchPrizeFace from './ScratchPrizeFace'
import ScratchFoilLayer from './ScratchFoilLayer'
import type { ScratchCardCopy, ScratchCardTheme, ScratchPrize } from './types'

/*
  The player-facing 3D Scratch Card — the reusable replacement for the old
  Cups mechanic. Fully driven by `theme`/`prize`/`copy`, never a specific
  brand:

    <ScratchCard3D theme={campaign.scratchCardTheme} prize={campaignPrize}
      copy={...} onRevealed={(amount) => ...} />

  Layered top-to-bottom (see dice-theme.css's "Scratch card" section):
    1. ScratchCardMesh (3D) / ScratchCardFallback (CSS) — the physical card,
       always visible, behind everything else.
    2. A slim header strip (logo + brand name) — printed on the card, never
       covered by the foil, so the brand stays visible even before scratching.
    3. The scratch zone: ScratchPrizeFace (the hidden result) under
       ScratchFoilLayer (the interactive metallic foil) — sized generously
       for a comfortable touch target, not the whole card.

  WebGL failures degrade to ScratchCardFallback via WebGLErrorBoundary —
  the scratch zone itself (layers 2-3) is identical either way, so a driver
  problem never breaks gameplay, only the card's visual depth.
*/

export interface ScratchCard3DProps {
  theme: ScratchCardTheme
  prize: ScratchPrize
  copy: ScratchCardCopy
  onScratchStart?: () => void
  /** Fires exactly once, once the foil has fully cleared. */
  onRevealed: (amount: number) => void
}

export default function ScratchCard3D({ theme, prize, copy, onScratchStart, onRevealed }: ScratchCard3DProps) {
  // `revealing` flips the instant the threshold is hit — ScratchPrizeFace
  // starts its fade-in right then, in the same frame the foil starts
  // fading out, so the two read as one continuous crossfade instead of
  // "foil wipes away, THEN content pops in". `revealed` (locks the foil,
  // fires onRevealed) only flips once that crossfade has actually finished.
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const firedRef = useRef(false)

  function handleRevealBegin() {
    setRevealing(true)
  }

  function handleRevealed() {
    setRevealed(true)
    if (firedRef.current) return
    firedRef.current = true
    onRevealed(prize.amount)
  }

  return (
    // The outer box owns the card's silhouette (rounded corners, clip,
    // shadow) directly — a safety net so nothing inside it (3D mesh, foil,
    // prize face) can ever visually poke out past the card's own edge,
    // regardless of small mismatches between the camera's framing and the
    // DOM overlay's sizing. The boxShadow here is also a real,
    // guaranteed-visible depth cue that doesn't depend on the 3D scene (or
    // its WebGL-failure fallback) rendering "enough" shadow on its own.
    //
    // The 3D card is framed to fill ~92% of this box (an intentional ~4%
    // margin — see the camera fov below), and the DOM scratch zone insets
    // further still, at 8% (.scratch-card-zone in dice-theme.css) — that
    // gap is deliberate: it's what actually shows the reflective 3D
    // material as a visible "frame" around the foil/prize content, which
    // is the entire point of having a 3D card instead of a flat rectangle.
    <div
      className="scratch-card-3d"
      style={{ borderRadius: theme.radius, overflow: 'hidden', boxShadow: SHADOW_BY_INTENSITY[theme.shadowIntensity] }}
    >
      <div className="scratch-card-canvas-layer">
        <WebGLErrorBoundary
          fallback={
            <ScratchCardFallback colors={theme.colors} radius={theme.radius} shadowIntensity="none" />
          }
        >
          <Canvas
            camera={{ position: [0, 0, 5], fov: 27, near: 0.1, far: 50 }}
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]}
          >
            <ScratchCardMesh colors={theme.colors} radius={theme.radius} shadowIntensity="none" />
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      <div className="scratch-card-header">
        {theme.logoUrl ? (
          <img src={theme.logoUrl} alt={theme.brandName} className="scratch-card-logo" />
        ) : (
          <span className="scratch-card-brand-name">{theme.brandName}</span>
        )}
      </div>

      <div className="scratch-card-zone" style={{ borderRadius: Math.max(4, theme.radius * 0.65) }}>
        <ScratchPrizeFace theme={theme} prize={prize} copy={copy} revealed={revealing} />
        <ScratchFoilLayer
          foilStyle={theme.foilStyle}
          colors={theme.colors}
          label={copy.scratchLabel}
          revealThreshold={theme.revealThreshold}
          locked={revealed}
          onScratchStart={onScratchStart}
          onRevealBegin={handleRevealBegin}
          onRevealed={handleRevealed}
        />
      </div>
    </div>
  )
}
