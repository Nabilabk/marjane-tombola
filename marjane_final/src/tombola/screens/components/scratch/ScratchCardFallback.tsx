import { motion } from 'framer-motion'
import type { ScratchCardColors, ScratchShadowIntensity } from './types'

/*
  Pure-CSS stand-in for ScratchCardMesh, rendered by WebGLErrorBoundary's
  fallback when the 3D scene fails to initialize. Same footprint as the R3F
  canvas (fills its container), so the DOM overlay stack (foil + prize
  face) sits on top identically either way — only what's *behind* the
  overlay changes.
*/

export const SHADOW_BY_INTENSITY: Record<ScratchShadowIntensity, string> = {
  none: 'none',
  soft: '0 18px 30px -18px rgba(0,0,0,0.28)',
  medium: '0 26px 46px -20px rgba(0,0,0,0.4)',
  strong: '0 34px 60px -18px rgba(0,0,0,0.52)',
}

export default function ScratchCardFallback({
  colors,
  radius,
  shadowIntensity = 'medium',
}: {
  colors: ScratchCardColors
  radius: number
  shadowIntensity?: ScratchShadowIntensity
}) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.86, rotate: -3 }}
      animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="scratch-card-fallback"
      style={{
        borderRadius: radius,
        background: `linear-gradient(155deg, color-mix(in srgb, ${colors.secondary} 88%, white), ${colors.secondary} 45%, color-mix(in srgb, ${colors.secondary} 78%, black))`,
        boxShadow: SHADOW_BY_INTENSITY[shadowIntensity],
      }}
    >
      <div
        className="scratch-card-fallback-panel"
        style={{
          borderRadius: radius * 0.85,
          background: `linear-gradient(155deg, ${colors.primary}, color-mix(in srgb, ${colors.primary} 80%, black))`,
        }}
      />
    </motion.div>
  )
}
