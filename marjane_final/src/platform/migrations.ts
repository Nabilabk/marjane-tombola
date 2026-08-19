/*
  Data Migration — converts the legacy "Website" model (admin/lib/types.ts)
  into the unified "Campaign" model. This ensures any data a user already
  created in the old admin is preserved instead of being thrown away.

  The old model stored everything under `Website` (theme, stats) plus
  separate child arrays (products, rewards, tickets) keyed by websiteId.
  The new model folds all of these into a single `Campaign` object.
*/

import { buildMarjaneCampaign } from './seed'
import type { Campaign } from './types'

interface LegacyWebsite {
  id: string
  name: string
  slug: string
  description: string
  status: 'draft' | 'published' | 'maintenance'
  template: 'modern' | 'luxury' | 'corporate' | 'minimal'
  language: 'fr' | 'en' | 'ar'
  createdAt: string
  updatedAt: string
  domain: string
  theme: {
    primary: string
    secondary: string
    accent: string
    font: string
    radius: number
    buttonStyle: string
    buttonSize: string
    animationLevel: string
    shadowIntensity: string
    spacing: string
    borderWidth: number
    darkMode: boolean
    backgroundImageUrl: string
    logoUrl: string
    faviconUrl: string
    heroImageUrl: string
    brandImages: string[]
  }
  stats: {
    campaigns: number
    participants: number
    tickets: number
    winners: number
    conversion: number
  }
}

interface LegacyPlan {
  websites: LegacyWebsite[]
  campaigns: {
    id: string
    websiteId: string
    name: string
    startDate: string
    endDate: string
    status: 'draft' | 'active' | 'finished'
    participants: number
    ticketsIssued: number
    threshold: number
    prizes: number[]
  }[]
  products: { id: string; websiteId: string; name: string; brand: string; minQuantity: number; eligible: boolean; status: string; image: string }[]
  rewards: { id: string; websiteId: string; label: string; image: string; value: number; stock: number; probability: number; status: string }[]
  participants: { id: string; websiteId: string; name: string; phone: string; city: string; ticketCode: string; status: string; prizeWon?: number; createdAt: string }[]
  tickets: { id: string; websiteId: string; code: string; status: string; participantName: string; amount: number; scannedAt: string }[]
  notifications: { id: string; websiteId: string; title: string; detail: string; time: string; type: string; read: boolean }[]
  translations: { id: string; websiteId: string; key: string; fr: string; ar: string }[]
}

const LEGACY_KEY = 'campaignhub-platform'

function readLegacy(): LegacyPlan | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LegacyPlan
  } catch {
    return null
  }
}

/** Convert a legacy persisted plan into an array of Campaigns. */
export function migrateLegacyPlan(): Campaign[] {
  const legacy = readLegacy()
  if (!legacy || !Array.isArray(legacy.websites) || legacy.websites.length === 0) {
    return []
  }

  const campaigns: Campaign[] = legacy.websites.map((w) => {
    const base = buildMarjaneCampaign()
    const filtered = String(w.theme?.font ?? '') === 'display' ? undefined : undefined
    void filtered
    return {
      ...base,
      id: w.id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      status: w.status === 'published' ? 'live' : w.status === 'maintenance' ? 'ready' : 'draft',
      template: w.template,
      language: w.language,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      domain: w.domain,
      brand: {
        ...base.brand,
        name: w.name,
        logoUrl: w.theme.logoUrl || undefined,
        faviconUrl: w.theme.faviconUrl || undefined,
        colors: {
          primary: w.theme.primary,
          secondary: w.theme.secondary,
          accent: w.theme.accent,
        },
      },
      theme: {
        ...base.theme,
        primary: w.theme.primary,
        secondary: w.theme.secondary,
        accent: w.theme.accent,
        font: (w.theme.font as Campaign['theme']['font']) ?? 'display',
        radius: w.theme.radius,
        buttonStyle: (w.theme.buttonStyle as Campaign['theme']['buttonStyle']) ?? 'solid',
        buttonSize: (w.theme.buttonSize as Campaign['theme']['buttonSize']) ?? 'md',
        animationLevel: (w.theme.animationLevel as Campaign['theme']['animationLevel']) ?? 'subtle',
        shadowIntensity: (w.theme.shadowIntensity as Campaign['theme']['shadowIntensity']) ?? 'soft',
        spacing: (w.theme.spacing as Campaign['theme']['spacing']) ?? 'comfortable',
        borderWidth: w.theme.borderWidth,
        darkMode: w.theme.darkMode,
        backgroundImageUrl: w.theme.backgroundImageUrl,
        logoUrl: w.theme.logoUrl,
        faviconUrl: w.theme.faviconUrl,
        heroImageUrl: w.theme.heroImageUrl,
        brandImages: w.theme.brandImages ?? [],
      },
      analytics: {
        ...base.analytics,
        participants: w.stats.participants,
        conversionRate: w.stats.conversion,
        winningTickets: w.stats.winners,
        validatedTickets: w.stats.tickets,
      },
      products: (legacy.products ?? [])
        .filter((p) => p.websiteId === w.id)
        .map((p) => ({
          id: p.id,
          barcode: '',
          image: p.image,
          name: p.name,
          category: p.brand,
          minQuantity: p.minQuantity,
          eligible: p.eligible,
          status: p.status === 'active' ? ('active' as const) : ('paused' as const),
        })),
      prizes: (legacy.rewards ?? [])
        .filter((r) => r.websiteId === w.id)
        .map((r) => ({
          id: r.id,
          label: r.label,
          image: r.image,
          value: r.value,
          probability: r.probability,
          stock: r.stock,
          remainingStock: r.stock,
          winningRules: '',
          status: r.status === 'active' ? ('active' as const) : ('draft' as const),
        })),
      translations: (legacy.translations ?? [])
        .filter((t) => t.websiteId === w.id)
        .map((t) => ({ id: t.id, key: t.key, fr: t.fr, ar: t.ar })),
    }
  })

  return campaigns
}
