/*
  Admin view-model types — the admin UI's local shape.

  The admin UI reads/writes through `lib/store.ts`, which is now a
  compatibility adapter backed by the UNIFIED platform store (src/platform).
  These types describe the view the admin pages render; the underlying data
  lives in the shared `Campaign` model consumed by the public engine.
*/

import type { GameId } from '../../platform/types'

export type WebsiteStatus = 'draft' | 'published' | 'maintenance' | 'ended'
export type TemplateId = 'modern' | 'luxury' | 'corporate' | 'minimal'

export interface WebsiteTheme {
  primary: string
  secondary: string
  accent: string
  font: 'display' | 'classic' | 'rounded' | 'modern' | 'elegant' | 'playful'
  radius: number // 0-24
  buttonStyle: 'solid' | 'outline' | 'soft'
  buttonSize: 'sm' | 'md' | 'lg'
  animationLevel: 'none' | 'subtle' | 'lively'
  shadowIntensity: 'none' | 'soft' | 'medium' | 'strong'
  spacing: 'compact' | 'comfortable' | 'spacious'
  borderWidth: number // 0-3
  darkMode: boolean
  backgroundImageUrl: string
  logoUrl: string
  faviconUrl: string
  heroImageUrl: string
  brandImages: string[]
  rulesUrl: string
  /** See CampaignTheme.showBrandName — optional, defaults to `true`. */
  showBrandName?: boolean
}

export interface Website {
  id: string
  name: string
  slug: string
  description: string
  status: WebsiteStatus
  template: TemplateId
  language: 'fr' | 'en' | 'ar'
  createdAt: string
  updatedAt: string
  domain: string
  theme: WebsiteTheme
  /** Temporary pause, independent of `status` — see platform/types.ts's
   * Campaign.maintenanceMode. */
  maintenanceMode: boolean
  schedule: { startDate: string; startTime: string; endDate: string; endTime: string }
  stats: {
    campaigns: number
    participants: number
    tickets: number
    winners: number
    conversion: number // %
  }
}

export type CampaignStatus = 'draft' | 'active' | 'finished'

export interface Campaign {
  id: string
  websiteId: string
  name: string
  startDate: string
  endDate: string
  status: CampaignStatus
  participants: number
  ticketsIssued: number
  threshold: number
  prizes: number[]
  /** Odds of winning each `prizes[i]`, as a % — parallel array, same index. */
  probabilities: number[]
  /** Which tombola mechanic this campaign plays: Dice+Cards / Wheel / Cups. */
  gameId: GameId
  /** Cups: fixed number of cups revealed. Dice+Cards: the dice-derived pick
      count, not this setting — kept here for a consistent read/write shape. */
  pickLimit: number
}

export interface Asset {
  id: string
  websiteId: string
  name: string
  type: 'image' | 'icon' | 'document'
  folder: string
  sizeKb: number
  url: string
  uploadedAt: string
}

export interface ActivityItem {
  id: string
  websiteId: string
  label: string
  detail: string
  time: string
}

export interface Product {
  id: string
  websiteId: string
  image: string
  name: string
  brand: string
  minQuantity: number
  eligible: boolean
  status: 'active' | 'paused'
  updatedAt: string
}

export interface AdminNotification {
  id: string
  websiteId: string
  title: string
  detail: string
  time: string
  type: 'info' | 'success' | 'warning' | 'danger'
  read: boolean
}

export interface Translation {
  id: string
  websiteId: string
  key: string
  fr: string
  ar: string
}
