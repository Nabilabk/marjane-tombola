/*
  Unified Campaign Model — the single source of truth for the whole platform.

  Every editor (theme, brand, pages, games, products, prizes, assets,
  translations, schedule, permissions, analytics) reads and mutates ONE
  strongly-typed `Campaign` object. Nothing is hardcoded in the UI.

  This model supersedes the old `admin/lib/types.ts` "Website" concept and the
  `tombola/brands.ts` "Brand" concept. A campaign IS a deployable tombola
  website (e.g. Marjane Summer, Coca-Cola Ramadan, Samsung Festival).
*/

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'live'
  | 'ended'
  | 'archived'

export type Lang = 'fr' | 'ar' | 'en'

export type TemplateId = 'modern' | 'luxury' | 'corporate' | 'minimal'

export type FontFamily = 'display' | 'classic' | 'rounded'
export type ButtonStyle = 'solid' | 'outline' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type AnimationLevel = 'none' | 'subtle' | 'lively'
export type ShadowIntensity = 'none' | 'soft' | 'medium' | 'strong'
export type Spacing = 'compact' | 'comfortable' | 'spacious'

export interface CampaignTheme {
  primary: string
  secondary: string
  accent: string
  font: FontFamily
  radius: number
  buttonStyle: ButtonStyle
  buttonSize: ButtonSize
  animationLevel: AnimationLevel
  shadowIntensity: ShadowIntensity
  spacing: Spacing
  borderWidth: number
  darkMode: boolean
  backgroundImageUrl: string
  logoUrl: string
  faviconUrl: string
  heroImageUrl: string
  brandImages: string[]
}

export interface CampaignBrand {
  name: string
  tagline: string
  logoUrl?: string
  faviconUrl?: string
  productLine: string
  packshot: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
}

export type PageId =
  | 'home'
  | 'scan'
  | 'game'
  | 'rules'
  | 'faq'
  | 'winner'
  | 'contact'
  | 'privacy'

export interface CampaignPage {
  id: PageId
  name: string
  description: string
  enabled: boolean
  /** Editable content. Every page reads campaign.pages — never hardcoded. */
  content: Record<string, string>
  order: number
}

// 'raffle' has no mini-game at all: the player scans their ticket and is
// simply entered into a draw (tirage au sort) — the winner is picked later
// by the admin instead of by an instant on-screen mechanic. See FLOWS.raffle
// in engine/CampaignEngine.tsx.
export type GameId = 'cards' | 'scratch' | 'wheel' | 'cups' | 'chest' | 'raffle'

export interface GameConfig {
  id: GameId
  name: string
  enabled: boolean
  /** Full mutable config for the renderer + its configuration panel. */
  settings: Record<string, string | number | boolean>
  /** Per-game prize distribution (values in campaign currency units). */
  prizes: number[]
  /** Odds of landing each `prizes[i]`, as a percentage (0-100). Parallel
      array to `prizes` — same index, same length. Relative weights, not
      required to sum to exactly 100 (the draw normalizes), but the admin
      UI nudges toward 100 so the numbers read as real percentages. Missing
      or mismatched-length (older saved campaigns) falls back to a uniform
      split — see `withUniformFallback` in `engine/theme.ts`. */
  probabilities: number[]
  /** Number of picks the player is allowed (e.g. dice limit). */
  pickLimit: number
}

export interface Product {
  id: string
  barcode: string
  image: string
  name: string
  category: string
  minQuantity: number
  eligible: boolean
  status: 'active' | 'paused'
}

export interface Prize {
  id: string
  label: string
  image: string
  value: number
  probability: number // %
  stock: number
  remainingStock: number
  winningRules: string
  status: 'active' | 'draft'
}

export interface Asset {
  id: string
  name: string
  type: 'image' | 'icon' | 'document' | 'audio' | 'video'
  folder: string
  sizeKb: number
  url: string
  uploadedAt: string
}

export interface Translation {
  id: string
  key: string
  fr: string
  ar: string
  en?: string
}

export interface CampaignSchedule {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

export interface CampaignPermissions {
  owner: string
  editors: string[]
  viewers: string[]
}

export interface CampaignAnalytics {
  participants: number
  validatedTickets: number
  rejectedTickets: number
  winningTickets: number
  dailyScans: number
  conversionRate: number
  topProducts: string[]
  topStores: string[]
  languages: Record<Lang, number>
  devices: Record<string, number>
}

export interface Campaign {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  description: string
  template: TemplateId
  language: Lang
  createdAt: string
  updatedAt: string
  domain: string
  /** Temporary pause, independent of `status` — a "Live" campaign can be
   * flipped into maintenance without losing its place in the kanban, and
   * flipped back without re-launching it. See CampaignEngine's gate and
   * backend app.py's _lifecycle_block (kept in sync via
   * admin/services/campaignLifecycleApi.ts). */
  maintenanceMode: boolean

  brand: CampaignBrand
  theme: CampaignTheme
  pages: CampaignPage[]
  game: GameConfig
  products: Product[]
  prizes: Prize[]
  assets: Asset[]
  translations: Translation[]
  schedule: CampaignSchedule
  permissions: CampaignPermissions
  analytics: CampaignAnalytics
}

export interface Participant {
  id: string
  campaignId: string
  name: string
  phone: string
  city: string
  ticketCode: string
  status: 'pending' | 'validated' | 'winner'
  prizeWon?: number
  createdAt: string
}

export interface Ticket {
  id: string
  campaignId: string
  code: string
  status: 'scanned' | 'valid' | 'invalid'
  participantName: string
  amount: number
  scannedAt: string
}

export interface Notification {
  id: string
  campaignId: string
  title: string
  detail: string
  time: string
  type: 'info' | 'success' | 'warning' | 'danger'
  read: boolean
}

export interface ActivityItem {
  id: string
  campaignId: string
  label: string
  detail: string
  time: string
}
