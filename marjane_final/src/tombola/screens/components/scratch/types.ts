/*
  Shared types for the 3D Scratch Card — the reusable, campaign-agnostic
  replacement for the old Cups mechanic. `ScratchCardTheme` carries
  everything the card's *design* needs (colors, images, foil/reveal style);
  `ScratchCardCopy` carries everything that's language-dependent (built from
  the campaign's i18n dict, one level up, exactly like `dhLabel` used to be
  threaded into CupScene3D separately from `brand`). Neither type ever
  refers to a specific brand — see `campaignToScratchTheme` in
  `src/engine/theme.ts` for how a real Campaign is adapted into this shape.
*/

export type ScratchFoilStyle = 'silver' | 'gold' | 'brandPrimary' | 'brushedDark'
export type ScratchRevealAnimation = 'shine' | 'confettiBurst' | 'simple'
export type ScratchShadowIntensity = 'none' | 'soft' | 'medium' | 'strong'

export interface ScratchCardColors {
  primary: string
  secondary: string
  accent: string
}

export interface ScratchCardTheme {
  brandName: string
  logoUrl?: string
  colors: ScratchCardColors
  backgroundImageUrl?: string
  /** Decorative image shown behind/around the prize amount once revealed —
   *  falls back to the campaign's generic packshot when not set. */
  productImageUrl?: string
  foilStyle: ScratchFoilStyle
  revealAnimation: ScratchRevealAnimation
  /** Card corner radius, campaign theme units (same scale as CampaignTheme.radius). */
  radius: number
  shadowIntensity: ScratchShadowIntensity
  /** % of the foil that must be scratched away before the rest auto-reveals. */
  revealThreshold: number
}

/** The result of the round — intentionally minimal: the backend draw
 *  (`/api/play`) only ever returns an amount, so that's all this card
 *  needs to know to render a win or a loss. */
export interface ScratchPrize {
  amount: number
}

/** Everything language-dependent, resolved by the caller (ScratchScreen)
 *  from the campaign's translation dict before rendering the card. */
export interface ScratchCardCopy {
  /** Baked onto the foil itself, e.g. "GRATTEZ ICI". */
  scratchLabel: string
  winLabel: string
  loseLabel: string
  /** Currency/unit label shown next to the amount, e.g. "DH". */
  currencyLabel: string
}

export function defaultScratchCardTheme(colors: ScratchCardColors, brandName = ''): ScratchCardTheme {
  return {
    brandName,
    colors,
    foilStyle: 'brandPrimary',
    revealAnimation: 'shine',
    radius: 24,
    shadowIntensity: 'medium',
    revealThreshold: 70,
  }
}
