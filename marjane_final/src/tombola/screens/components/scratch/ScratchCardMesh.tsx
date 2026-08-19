import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { ScratchCardColors, ScratchShadowIntensity } from './types'

/*
  The 3D card body — depth, rounded corners, a lacquered/metallic material
  for real reflections, a soft contact shadow, a gentle idle tilt and a
  spring-in entrance. This mesh never renders the foil or the prize face —
  those live in the DOM overlay stack above it (see ScratchCard3D.tsx's doc
  comment for why), so this component's only job is to look like a premium
  physical object sitting under that overlay.

  Sizing mirrors CupScene3D's approach: a fixed set of world-unit constants
  tuned to the card's on-screen aspect ratio (see CARD_W/CARD_H, matched to
  .scratch-card-3d's CSS aspect-ratio in dice-theme.css) rather than reading
  pixel sizes from the DOM.
*/

const CARD_W = 3.4
const CARD_H = 2.2

const SHADOW_OPACITY: Record<ScratchShadowIntensity, number> = {
  none: 0,
  soft: 0.22,
  medium: 0.38,
  strong: 0.55,
}

export default function ScratchCardMesh({
  colors,
  radius,
  shadowIntensity = 'medium',
  depth = 0.18,
}: {
  colors: ScratchCardColors
  radius: number
  shadowIntensity?: ScratchShadowIntensity
  depth?: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const entrance = useRef(0)
  // World-unit radius scaled down from the CSS px value the admin edits —
  // keeps "radius" one shared concept across the DOM overlay and the mesh.
  const worldRadius = Math.min(0.42, Math.max(0.04, radius / 60))

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return

    entrance.current = Math.min(1, entrance.current + delta / 0.65)
    const ease = 1 - Math.pow(1 - entrance.current, 3)
    g.scale.setScalar(0.82 + 0.18 * ease)

    const t = state.clock.elapsedTime
    const idleX = 0.045 * Math.sin(t * 0.55)
    const idleY = 0.065 * Math.sin(t * 0.4 + 1.2)
    const k = 1 - Math.pow(0.02, delta)
    g.rotation.x += (idleX - g.rotation.x) * k
    g.rotation.y += (idleY - g.rotation.y) * k
    g.position.y += (Math.sin(t * 0.5) * 0.03 - (g.position.y - 0)) * k
  })

  return (
    <group ref={groupRef}>
      {/* Card body — the "secondary" color reads as the metal/lacquer shell. */}
      <RoundedBox args={[CARD_W, CARD_H, depth]} radius={worldRadius} smoothness={6} castShadow>
        <meshPhysicalMaterial
          color={colors.secondary}
          roughness={0.32}
          metalness={0.28}
          clearcoat={0.55}
          clearcoatRoughness={0.22}
        />
      </RoundedBox>

      {/* Inset front panel — a thin "primary" bezel, gives the card a
          two-tone premium-packaging look without needing a texture. */}
      <RoundedBox
        args={[CARD_W - 0.16, CARD_H - 0.16, depth * 0.5]}
        radius={worldRadius * 0.85}
        position={[0, 0, depth * 0.3]}
      >
        <meshPhysicalMaterial color={colors.primary} roughness={0.4} metalness={0.12} clearcoat={0.25} />
      </RoundedBox>

      <ambientLight intensity={0.7} color="#f4f1ea" />
      <directionalLight position={[3, 4, 4]} intensity={1.15} color="#fff2e0" castShadow />
      <directionalLight position={[-3.2, 1.4, -2]} intensity={0.4} color="#8fb8ff" />
      <directionalLight position={[0, -2, 3]} intensity={0.2} color="#ffffff" />

      {SHADOW_OPACITY[shadowIntensity] > 0 && (
        <ContactShadows
          position={[0, -CARD_H / 2 - 0.08, 0]}
          opacity={SHADOW_OPACITY[shadowIntensity]}
          scale={CARD_W * 1.8}
          blur={2.4}
          far={1.4}
        />
      )}
    </group>
  )
}
