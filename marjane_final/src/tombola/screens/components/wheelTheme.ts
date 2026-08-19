/*
  Shared types for the Wheel's *design* — the wheel-mechanic equivalent of
  `scratch/types.ts`'s ScratchCardTheme. Colors/logo/background are the same
  campaign-wide fields every game reads; rim/pointer/spin style and shadow
  are genuinely wheel-only knobs, parallel to Scratch's foilStyle/
  revealAnimation. See `campaignToWheelTheme` in `src/engine/theme.ts` for
  how a real Campaign is adapted into this shape.
*/

export type WheelRimStyle = 'classic' | 'minimal' | 'neon'
export type WheelPointerStyle = 'classic' | 'ribbon' | 'arrow'
export type WheelSpinStyle = 'smooth' | 'bouncy' | 'mechanical'
export type WheelShadowIntensity = 'none' | 'soft' | 'medium' | 'strong'

export interface WheelColors {
  primary: string
  secondary: string
  accent: string
}

export interface WheelTheme {
  brandName: string
  logoUrl?: string
  colors: WheelColors
  backgroundImageUrl?: string
  shadowIntensity: WheelShadowIntensity
  rimStyle: WheelRimStyle
  pointerStyle: WheelPointerStyle
  spinStyle: WheelSpinStyle
}

export function defaultWheelTheme(colors: WheelColors, brandName = ''): WheelTheme {
  return {
    brandName,
    colors,
    shadowIntensity: 'medium',
    rimStyle: 'classic',
    pointerStyle: 'classic',
    spinStyle: 'smooth',
  }
}
