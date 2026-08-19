/*
  Theme Engine — maps a Campaign.theme + Campaign.brand onto the CSS custom
  properties the public site reads (--brand-primary, --brand-secondary,
  --brand-accent, plus derived neutrals). Both the admin preview and the
  public website call this so they ALWAYS stay in sync.

  The tombola screens read `var(--brand-*)` / `var(--page)` / `var(--ink)` /
  `var(--hairline)` / `var(--card)` / `var(--field)` — so updating these vars
  re-skins the real website live, without refresh.
*/

import type { CSSProperties } from 'react'
import type { Campaign } from '../platform/types'
import { resolveProbabilities } from '../platform/probabilities'
import type {
  ScratchCardTheme,
  ScratchFoilStyle,
  ScratchRevealAnimation,
  ScratchShadowIntensity,
} from '../tombola/screens/components/scratch/types'
import type { WheelTheme, WheelRimStyle, WheelPointerStyle, WheelSpinStyle } from '../tombola/screens/components/wheelTheme'
import type {
  CardsTheme,
  CardBackPattern,
  DiceStyle,
  GameGlowColor,
} from '../tombola/screens/components/cardsTheme'

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
}

/** Derive accessible neutrals from the brand colors. */
export function applyCampaignTheme(campaign: Campaign) {
  const theme = campaign.theme
  const brand = campaign.brand.colors

  const root = document.documentElement
  root.style.setProperty('--brand-primary', theme.primary || brand.primary)
  root.style.setProperty('--brand-secondary', theme.secondary || brand.secondary)
  root.style.setProperty('--brand-accent', theme.accent || brand.accent)

  // Derived neutrals — warm off-white ground, ink, hairlines, cards.
  root.style.setProperty('--page', theme.darkMode ? '#121316' : '#fcfaf6')
  root.style.setProperty('--ink', theme.darkMode ? '#EDEDF0' : '#1a1714')
  root.style.setProperty('--ink-muted', theme.darkMode ? '#9B9EA7' : '#6f6a63')
  root.style.setProperty('--hairline', theme.darkMode ? 'rgba(255,255,255,0.12)' : '#e7e1d7')
  root.style.setProperty('--card', theme.darkMode ? '#1B1D22' : '#ffffff')
  root.style.setProperty('--field', theme.darkMode ? '#17181C' : '#ffffff')

  // Typography
  const fontFamily =
    theme.font === 'classic'
      ? 'Georgia, serif'
      : theme.font === 'rounded'
        ? "'Inter', sans-serif"
        : "'Bricolage Grotesque', ui-serif, Georgia, serif"
  root.style.setProperty('--font-display', fontFamily)

  // Dynamic radius + spacing for the whole app
  root.style.setProperty('--radius', `${theme.radius}px`)

  // Favicon
  const favicon = theme.faviconUrl || campaign.brand.faviconUrl
  if (favicon) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = favicon
  }
}

export interface BrandView {
  id: string
  name: string
  logoUrl?: string
  heroImageUrl?: string
  productLine: string
  packshot: string
  colors: BrandColors
  threshold: number
  prizes: number[]
  /** Odds of landing each `prizes[i]`, in %, same index/length as `prizes`. */
  probabilities: number[]
}

/**
 * Convert a Campaign into the `Brand` shape the existing tombola screens
 * already expect. This lets us reuse FormScreen/ScanScreen/DiceScreen/
 * CardsScreen/ResultScreen without rewriting them — they stay props-driven,
 * but the props now come from the unified Campaign object.
 */
export function campaignToBrand(campaign: Campaign): BrandView {
  const usingGamePrizes = campaign.game.prizes.length > 0
  const prizeValues = usingGamePrizes
    ? campaign.game.prizes
    : campaign.prizes.filter((p) => p.value > 0).map((p) => p.value)

  // Odds line up with `prizeValues` by index. When falling back to the
  // Rewards catalog above, reuse each prize's own `probability` field
  // instead of resolving a fresh uniform split.
  const probabilities = usingGamePrizes
    ? resolveProbabilities(campaign.game.prizes, campaign.game.probabilities)
    : resolveProbabilities(
        prizeValues,
        campaign.prizes.filter((p) => p.value > 0).map((p) => p.probability),
      )

  // Minimum receipt amount (MAD) to qualify. Uses the game threshold setting,
  // falling back to a sensible default of 100.
  const threshold =
    typeof campaign.game.settings.threshold === 'number' && campaign.game.settings.threshold > 0
      ? campaign.game.settings.threshold
      : 100

  return {
    id: campaign.slug,
    name: campaign.brand.name || campaign.name,
    logoUrl: campaign.theme.logoUrl || campaign.brand.logoUrl,
    heroImageUrl: campaign.theme.heroImageUrl || undefined,
    productLine: campaign.brand.productLine,
    packshot: campaign.brand.packshot,
    colors: {
      primary: campaign.theme.primary,
      secondary: campaign.theme.secondary,
      accent: campaign.theme.accent,
    },
    threshold,
    prizes: prizeValues.length > 0 ? prizeValues : [0],
    probabilities: prizeValues.length > 0 ? probabilities : [100],
  }
}

/**
 * Convert a Campaign into the ScratchCardTheme the 3D Scratch Card expects
 * — the scratch-mechanic equivalent of `campaignToBrand` above. Reuses
 * `campaign.theme`/`campaign.brand` for everything that already has a
 * home (colors, logo, radius, shadow, background) instead of forking a
 * parallel copy of that state; only the handful of genuinely new
 * scratch-only knobs (foil style, reveal animation, product image
 * override, reveal threshold) come from `campaign.game.settings`, the
 * same free-form bag `campaignToBrand` already reads `threshold` from.
 */
export function campaignToScratchTheme(campaign: Campaign): ScratchCardTheme {
  const s = campaign.game.settings

  return {
    brandName: campaign.brand.name || campaign.name,
    logoUrl: campaign.theme.logoUrl || campaign.brand.logoUrl,
    colors: {
      primary: campaign.theme.primary,
      secondary: campaign.theme.secondary,
      accent: campaign.theme.accent,
    },
    backgroundImageUrl: campaign.theme.backgroundImageUrl || undefined,
    productImageUrl:
      (typeof s.scratchProductImageUrl === 'string' && s.scratchProductImageUrl) ||
      campaign.brand.packshot ||
      undefined,
    foilStyle: (typeof s.scratchFoilStyle === 'string' ? (s.scratchFoilStyle as ScratchFoilStyle) : undefined) ||
      'brandPrimary',
    revealAnimation:
      (typeof s.scratchRevealAnimation === 'string'
        ? (s.scratchRevealAnimation as ScratchRevealAnimation)
        : undefined) || 'shine',
    radius: campaign.theme.radius || 24,
    shadowIntensity: (campaign.theme.shadowIntensity as ScratchShadowIntensity) || 'medium',
    revealThreshold: typeof s.scratchRevealThreshold === 'number' ? s.scratchRevealThreshold : 70,
  }
}

/**
 * Convert a Campaign into the WheelTheme the Wheel game expects — the
 * wheel-mechanic equivalent of `campaignToScratchTheme` above. Colors/logo/
 * background/shadow all reuse `campaign.theme` (same "Shadow" control the
 * Scratch Card panel already edits, so setting it once affects whichever
 * game the site actually plays); rim/pointer/spin style are the genuinely
 * wheel-only knobs, stored in `campaign.game.settings`.
 */
export function campaignToWheelTheme(campaign: Campaign): WheelTheme {
  const s = campaign.game.settings

  return {
    brandName: campaign.brand.name || campaign.name,
    logoUrl: campaign.theme.logoUrl || campaign.brand.logoUrl,
    colors: {
      primary: campaign.theme.primary,
      secondary: campaign.theme.secondary,
      accent: campaign.theme.accent,
    },
    backgroundImageUrl: campaign.theme.backgroundImageUrl || undefined,
    shadowIntensity: (campaign.theme.shadowIntensity as ScratchShadowIntensity) || 'medium',
    rimStyle: (typeof s.wheelRimStyle === 'string' ? (s.wheelRimStyle as WheelRimStyle) : undefined) || 'classic',
    pointerStyle:
      (typeof s.wheelPointerStyle === 'string' ? (s.wheelPointerStyle as WheelPointerStyle) : undefined) ||
      'classic',
    spinStyle:
      (typeof s.wheelSpinStyle === 'string' ? (s.wheelSpinStyle as WheelSpinStyle) : undefined) || 'smooth',
  }
}

/**
 * Convert a Campaign into the CardsTheme the Dice + Cards flow expects —
 * same pattern as `campaignToWheelTheme` above. Card-back pattern, dice
 * style and glow color are the genuinely dice+cards-only knobs, stored in
 * `campaign.game.settings`.
 */
export function campaignToCardsTheme(campaign: Campaign): CardsTheme {
  const s = campaign.game.settings

  return {
    brandName: campaign.brand.name || campaign.name,
    logoUrl: campaign.theme.logoUrl || campaign.brand.logoUrl,
    colors: {
      primary: campaign.theme.primary,
      secondary: campaign.theme.secondary,
      accent: campaign.theme.accent,
    },
    backgroundImageUrl: campaign.theme.backgroundImageUrl || undefined,
    shadowIntensity: (campaign.theme.shadowIntensity as ScratchShadowIntensity) || 'medium',
    cardBackPattern:
      (typeof s.cardsBackPattern === 'string' ? (s.cardsBackPattern as CardBackPattern) : undefined) ||
      'ornament',
    diceStyle: (typeof s.cardsDiceStyle === 'string' ? (s.cardsDiceStyle as DiceStyle) : undefined) || 'classic',
    glowColor: (typeof s.cardsGlowColor === 'string' ? (s.cardsGlowColor as GameGlowColor) : undefined) || 'gold',
  }
}

/** Minimal style object for embedding the engine inside an iframe/phone frame. */
export function campaignCssVars(campaign: Campaign): CSSProperties {
  return {
    '--brand-primary': campaign.theme.primary,
    '--brand-secondary': campaign.theme.secondary,
    '--brand-accent': campaign.theme.accent,
  } as CSSProperties
}
