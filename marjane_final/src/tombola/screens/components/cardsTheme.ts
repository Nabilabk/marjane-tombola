/*
  Shared types for the Dice + Cards flow's *design* — the dice/cards
  equivalent of `scratch/types.ts`'s ScratchCardTheme. Colors/logo/
  background are the same campaign-wide fields every game reads;
  card-back pattern, dice style and glow color are genuinely dice+cards-
  only knobs, parallel to Scratch's foilStyle/revealAnimation. See
  `campaignToCardsTheme` in `src/engine/theme.ts` for how a real Campaign
  is adapted into this shape.
*/

export type CardBackPattern = 'ornament' | 'diamond' | 'minimal' | 'logoFocus'
export type DiceStyle = 'classic' | 'midnight' | 'brandTint'
export type GameGlowColor = 'gold' | 'brandAccent' | 'silver'
export type CardsShadowIntensity = 'none' | 'soft' | 'medium' | 'strong'

export interface CardsColors {
  primary: string
  secondary: string
  accent: string
}

export interface CardsTheme {
  brandName: string
  logoUrl?: string
  colors: CardsColors
  backgroundImageUrl?: string
  shadowIntensity: CardsShadowIntensity
  cardBackPattern: CardBackPattern
  diceStyle: DiceStyle
  glowColor: GameGlowColor
}

export function defaultCardsTheme(colors: CardsColors, brandName = ''): CardsTheme {
  return {
    brandName,
    colors,
    shadowIntensity: 'medium',
    cardBackPattern: 'ornament',
    diceStyle: 'classic',
    glowColor: 'gold',
  }
}

/** Resolves a `GameGlowColor` to the actual CSS color it should render as —
 *  single source of truth so the dice burst, card glow and result number
 *  glow all agree with each other and with the admin editor's preview. */
export function resolveGlowColor(glow: GameGlowColor, accent: string): string {
  if (glow === 'brandAccent') return accent
  if (glow === 'silver') return '#c7ccd6'
  return '#c9a24b' // gold — matches the previous hardcoded --dice-gold default
}
