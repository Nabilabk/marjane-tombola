/*
  Admin Store — compatibility adapter (NO fake data).

  The admin UI keeps its familiar API — `usePlatformStore((s) => s.websites)`,
  `s.updateTheme`, `s.campaignsFor`, etc. — but the DATA now lives in the
  UNIFIED platform store (src/platform/store.ts), which is the SAME data the
  public website renders through CampaignEngine.

  This is the architectural bridge that fixes the disconnected architecture:
  editing the admin now updates the campaign object that the public site
  renders, with no duplicated state and no mock data.
*/

import { create } from 'zustand'
import { usePlatformStore as useCampaignStore } from '../../platform/store'
import type { Campaign as PlatformCampaign, GameId } from '../../platform/types'
import { buildMarjaneCampaign } from '../../platform/seed'
import { resolveProbabilities } from '../../platform/probabilities'
import type {
  Website,
  WebsiteTheme,
  Campaign,
  Asset,
  ActivityItem,
  Product,
  AdminNotification,
  Translation,
  TemplateId,
} from './types'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function iso(daysAgo: number, hour = 10) {
  const d = new Date(Date.now() - daysAgo * 86400000)
  d.setHours(hour, 12, 0, 0)
  return d.toISOString()
}

/** Ensure the unified store has a campaign (the real Marjane one). */
function ensureCampaigns() {
  if (useCampaignStore.getState().campaigns.length === 0) {
    useCampaignStore.getState().createCampaign({
      name: 'Marjane Summer Campaign',
      slug: 'marjane',
      description: 'Grande tombola d’été — une expérience qui fait gagner.',
      template: 'modern',
      language: 'fr',
      theme: {
        primary: '#0C2340',
        secondary: '#F5A623',
        accent: '#2D6BE7',
      },
    })
  }
}

/** A campaign is permanently over — status says so, or its scheduled end
 * has passed — independent of the admin-toggled maintenance flag. Mirrors
 * CampaignEngine.tsx's `isEnded` (and backend/app.py's `_lifecycle_block`)
 * so the dashboard card agrees with what visitors actually see. */
function isCampaignEnded(c: PlatformCampaign): boolean {
  if (c.status === 'ended' || c.status === 'archived') return true
  if (!c.schedule.endDate) return false
  const endMs = new Date(`${c.schedule.endDate}T${c.schedule.endTime || '23:59'}:00`).getTime()
  return Date.now() > endMs
}

/** Convert a platform Campaign → admin Website view. */
function campaignToWebsite(c: PlatformCampaign): Website {
  // Ended takes priority over maintenance — a finished tombola shouldn't
  // read as "Maintenance" just because it isn't 'live'/'published' either.
  const status: Website['status'] = isCampaignEnded(c)
    ? 'ended'
    : c.status === 'live' || c.status === 'published'
      ? 'published'
      : c.status === 'draft' || c.status === 'ready'
        ? 'draft'
        : 'maintenance'
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    status,
    template: c.template,
    language: c.language,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    domain: c.domain,
    maintenanceMode: c.maintenanceMode,
    schedule: c.schedule,
    theme: {
      primary: c.theme.primary,
      secondary: c.theme.secondary,
      accent: c.theme.accent,
      font: c.theme.font,
      radius: c.theme.radius,
      buttonStyle: c.theme.buttonStyle,
      buttonSize: c.theme.buttonSize,
      animationLevel: c.theme.animationLevel,
      shadowIntensity: c.theme.shadowIntensity,
      spacing: c.theme.spacing,
      borderWidth: c.theme.borderWidth,
      darkMode: c.theme.darkMode,
      backgroundImageUrl: c.theme.backgroundImageUrl,
      logoUrl: c.theme.logoUrl,
      faviconUrl: c.theme.faviconUrl,
      heroImageUrl: c.theme.heroImageUrl,
      brandImages: c.theme.brandImages,
    },
    stats: {
      campaigns: 1,
      participants: c.analytics.participants,
      tickets: c.analytics.validatedTickets,
      winners: c.analytics.winningTickets,
      conversion: c.analytics.conversionRate,
    },
  }
}

/** Convert a platform Campaign → admin Campaign view. */
function campaignToAdminCampaign(c: PlatformCampaign): Campaign {
  return {
    id: c.id,
    websiteId: c.id,
    name: c.name,
    startDate: c.schedule.startDate,
    endDate: c.schedule.endDate,
    status:
      c.status === 'live' || c.status === 'published'
        ? 'active'
        : c.status === 'ended'
          ? 'finished'
          : 'draft',
    participants: c.analytics.participants,
    ticketsIssued: c.analytics.validatedTickets,
    threshold: typeof c.game.settings.threshold === 'number' ? c.game.settings.threshold : 100,
    prizes: c.game.prizes,
    probabilities: resolveProbabilities(c.game.prizes, c.game.probabilities),
    gameId: c.game.id,
    pickLimit: c.game.pickLimit,
  }
}

interface PlatformState {
  websites: Website[]
  campaigns: Campaign[]
  assets: Asset[]
  activity: ActivityItem[]
  products: Product[]
  notifications: AdminNotification[]
  translations: Translation[]

  // undo / redo — thin pass-through to the unified platform store, which
  // tracks the actual history (every editor here funnels through its
  // `updateCampaign`, see platform/store.ts).
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void

  getWebsite: (id: string) => Website | undefined
  createWebsite: (input: {
    name: string
    slug: string
    description: string
    template: TemplateId
    language: 'fr' | 'en' | 'ar'
    theme: Partial<WebsiteTheme>
  }) => string
  updateWebsite: (id: string, patch: Partial<Website>) => void
  updateTheme: (id: string, patch: Partial<WebsiteTheme>) => void
  deleteWebsite: (id: string) => void
  duplicateWebsite: (id: string) => void

  campaignsFor: (websiteId: string) => Campaign[]
  createCampaign: (websiteId: string, name: string) => void
  updateCampaignStatus: (id: string, status: Campaign['status']) => void
  duplicateCampaign: (id: string) => void
  archiveCampaign: (id: string) => void
  /** Temporary pause, independent of status — see platform/types.ts's
   * Campaign.maintenanceMode. */
  updateMaintenanceMode: (websiteId: string, on: boolean) => void
  updateSchedule: (
    websiteId: string,
    patch: Partial<{ startDate: string; startTime: string; endDate: string; endTime: string }>,
  ) => void
  /** Persists the wheel/dice prize ladder and/or the eligibility threshold
      for a website's campaign — both live on the unified Campaign's
      `game` config. */
  updatePrizeConfig: (websiteId: string, patch: { prizes?: number[]; probabilities?: number[]; threshold?: number; id?: GameId; pickLimit?: number; settings?: Record<string, string | number | boolean> }) => void

  assetsFor: (websiteId: string) => Asset[]
  activityFor: (websiteId: string) => ActivityItem[]
  productsFor: (websiteId: string) => Product[]
  notificationsFor: (websiteId: string) => AdminNotification[]
  translationsFor: (websiteId: string) => Translation[]

  createProduct: (websiteId: string, input: Omit<Product, 'id' | 'websiteId' | 'updatedAt'>) => void
  updateProduct: (websiteId: string, id: string, patch: Partial<Product>) => void
  deleteProduct: (websiteId: string, id: string) => void
  addAsset: (websiteId: string, name: string, folder: string, type: Asset['type'], sizeKb: number) => void
  deleteAsset: (websiteId: string, id: string) => void
  markAllNotificationsRead: (websiteId: string) => void
  updateTranslation: (websiteId: string, key: string, lang: 'fr' | 'ar', value: string) => void
}

// Build the admin view from the unified campaign store.
function deriveView() {
  const campaignState = useCampaignStore.getState()
  const campaigns = campaignState.campaigns
  return {
    websites: campaigns.map(campaignToWebsite),
    campaigns: campaigns.map(campaignToAdminCampaign),
    canUndo: campaignState.canUndo,
    canRedo: campaignState.canRedo,
  }
}

function sync(set: (partial: Partial<PlatformState>) => void) {
  const campaignState = useCampaignStore.getState()
  const campaigns = campaignState.campaigns
  // Idempotency guard: only propagate when the underlying campaign data
  // actually changed. This keeps the derived `websites`/`campaigns` arrays
  // reference-stable, which prevents React's useSyncExternalStore
  // "getSnapshot should be cached" infinite loop in the admin selectors.
  // Undo/redo always change `campaigns` (different snapshot restored), so
  // `canUndo`/`canRedo` are folded into this same guarded key rather than
  // needing a separate check.
  const key = `${campaigns.map((c) => `${c.id}:${c.updatedAt}`).join('|')}::${campaignState.canUndo}:${campaignState.canRedo}`
  if (key === lastSyncKey) return
  lastSyncKey = key
  const { websites, campaigns: adminCampaigns, canUndo, canRedo } = deriveView()
  set({ websites, campaigns: adminCampaigns, canUndo, canRedo })
}

let lastSyncKey = ''

// Ensure the unified store has a campaign exactly once, at module load.
// `ensureCampaigns` is NOT called from `deriveView`/`sync` so it can't
// recurse into the subscription feedback loop.
ensureCampaigns()

// Per-campaign memoization for the `*For(websiteId)` derived-list selectors
// below (campaignsFor/productsFor/assetsFor/translationsFor). Each of these
// maps a campaign (or its sub-array) into freshly-constructed objects, which
// — like `websites`/`campaigns` above — must stay reference-stable across
// calls or `useShallow` selectors on the components consuming them
// (Overview/Campaigns/Analytics/Prizes/Products/Assets/Languages tabs) hit
// React's "getSnapshot should be cached" infinite-render loop. Cache keyed
// on `updatedAt`, which `updateCampaign` always bumps on any mutation — same
// signal `lastSyncKey` already relies on above.
function memoizedFor<T>(
  cache: Map<string, { updatedAt: string; result: T[] }>,
  websiteId: string,
  campaign: PlatformCampaign,
  compute: () => T[],
): T[] {
  const cached = cache.get(websiteId)
  if (cached && cached.updatedAt === campaign.updatedAt) return cached.result
  const result = compute()
  cache.set(websiteId, { updatedAt: campaign.updatedAt, result })
  return result
}

const productsCache = new Map<string, { updatedAt: string; result: Product[] }>()
const assetsCache = new Map<string, { updatedAt: string; result: Asset[] }>()
const translationsCache = new Map<string, { updatedAt: string; result: Translation[] }>()
const campaignsForCache = new Map<string, { updatedAt: string; result: Campaign[] }>()

export const usePlatformStore = create<PlatformState>()((set, get) => {
  // Initial sync.
  lastSyncKey = ''
  const initial = deriveView()

  // Keep the admin view in sync whenever the unified store changes.
  // `sync` is idempotent — it only calls `set` when the underlying campaign
  // data (id:updatedAt) genuinely changed, so the derived arrays stay
  // reference-stable and React's useSyncExternalStore never loops.
  useCampaignStore.subscribe(() => {
    sync(set)
  })

  return {
    websites: initial.websites,
    campaigns: initial.campaigns,
    assets: [],
    activity: [],
    products: [],
    notifications: [],
    translations: [],

    canUndo: initial.canUndo,
    canRedo: initial.canRedo,
    undo: () => useCampaignStore.getState().undo(),
    redo: () => useCampaignStore.getState().redo(),

    getWebsite: (id) => get().websites.find((w) => w.id === id),

    createWebsite: (input) => {
      // Forward the FULL theme partial — not a hand-picked subset — so any
      // themeable field the caller sets (font/radius/shadow presets from a
      // template choice, logo/favicon/hero from an upload, etc.) actually
      // reaches the created campaign instead of being silently dropped.
      const id = useCampaignStore.getState().createCampaign({
        name: input.name,
        slug: input.slug,
        description: input.description,
        template: input.template,
        language: input.language,
        theme: input.theme,
      })
      sync(set)
      return id
    },

    updateWebsite: (id, patch) => {
      const c = useCampaignStore.getState().getCampaign(id)
      if (!c) return
      useCampaignStore.getState().updateCampaign(id, {
        name: patch.name ?? c.name,
        slug: patch.slug ?? c.slug,
        description: patch.description ?? c.description,
        status: patch.status === 'published' ? 'live' : patch.status === 'maintenance' ? 'ready' : c.status,
        language: patch.language ?? c.language,
        domain: patch.domain ?? c.domain,
      })
      sync(set)
    },

    updateTheme: (id, patch) => {
      useCampaignStore.getState().updateTheme(id, patch)
      sync(set)
    },

    deleteWebsite: (id) => {
      useCampaignStore.getState().deleteCampaign(id)
      sync(set)
    },

    duplicateWebsite: (id) => {
      useCampaignStore.getState().duplicateCampaign(id)
      sync(set)
    },

    campaignsFor: (websiteId) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return []
      return memoizedFor(campaignsForCache, websiteId, c, () => [campaignToAdminCampaign(c)])
    },

    createCampaign: (websiteId, name) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      // A website is one campaign; creating a campaign = creating a new website.
      useCampaignStore.getState().createCampaign({
        name,
        slug: `${c.slug}-campaign`,
        description: '',
        template: c.template,
        language: c.language,
        theme: {
          primary: c.theme.primary,
          secondary: c.theme.secondary,
          accent: c.theme.accent,
        },
      })
      sync(set)
    },

    updateCampaignStatus: (id, status) => {
      const map: Record<Campaign['status'], PlatformCampaign['status']> = {
        draft: 'draft',
        active: 'live',
        finished: 'ended',
      }
      useCampaignStore.getState().updateCampaignStatus(id, map[status])
      sync(set)
    },

    duplicateCampaign: (id) => {
      useCampaignStore.getState().duplicateCampaign(id)
      sync(set)
    },

    archiveCampaign: (id) => {
      useCampaignStore.getState().updateCampaignStatus(id, 'archived')
      sync(set)
    },

    updateMaintenanceMode: (websiteId, on) => {
      useCampaignStore.getState().updateMaintenanceMode(websiteId, on)
      sync(set)
    },

    updateSchedule: (websiteId, patch) => {
      useCampaignStore.getState().updateSchedule(websiteId, patch)
      sync(set)
    },

    updatePrizeConfig: (websiteId, patch) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      const settingsPatch = {
        ...(patch.threshold !== undefined ? { threshold: patch.threshold } : {}),
        ...(patch.settings ?? {}),
      }
      useCampaignStore.getState().updateGame(websiteId, {
        ...(patch.prizes ? { prizes: patch.prizes } : {}),
        ...(patch.probabilities ? { probabilities: patch.probabilities } : {}),
        ...(Object.keys(settingsPatch).length > 0
          ? { settings: { ...c.game.settings, ...settingsPatch } }
          : {}),
        ...(patch.id ? { id: patch.id } : {}),
        ...(patch.pickLimit !== undefined ? { pickLimit: patch.pickLimit } : {}),
      })
      sync(set)
    },

    assetsFor: (websiteId) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return []
      return memoizedFor(assetsCache, websiteId, c, () =>
        c.assets.map((a) => ({
          id: a.id,
          websiteId,
          name: a.name,
          type: a.type === 'document' ? 'document' : 'image',
          folder: a.folder,
          sizeKb: a.sizeKb,
          url: a.url,
          uploadedAt: a.uploadedAt,
        })),
      )
    },
    activityFor: () => [],
    productsFor: (websiteId) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return []
      return memoizedFor(productsCache, websiteId, c, () =>
        c.products.map((p) => ({
          id: p.id,
          websiteId,
          image: p.image,
          name: p.name,
          brand: p.category,
          minQuantity: p.minQuantity,
          eligible: p.eligible,
          status: p.status,
          updatedAt: c.updatedAt,
        })),
      )
    },
    notificationsFor: () => [],
    translationsFor: (websiteId) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return []
      return memoizedFor(translationsCache, websiteId, c, () =>
        c.translations.map((tr) => ({
          id: tr.id,
          websiteId,
          key: tr.key,
          fr: tr.fr,
          ar: tr.ar,
        })),
      )
    },

    createProduct: (websiteId, input) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      useCampaignStore.getState().updateCampaign(websiteId, {
        products: [
          ...c.products,
          {
            id: uid('prod'),
            barcode: '',
            image: input.image,
            name: input.name,
            category: input.brand,
            minQuantity: input.minQuantity,
            eligible: input.eligible,
            status: input.status,
          },
        ],
      })
      sync(set)
    },

    updateProduct: (websiteId, id, patch) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      useCampaignStore.getState().updateCampaign(websiteId, {
        products: c.products.map((p) =>
          p.id === id
            ? {
                ...p,
                name: patch.name ?? p.name,
                category: patch.brand ?? p.category,
                minQuantity: patch.minQuantity ?? p.minQuantity,
                eligible: patch.eligible ?? p.eligible,
                status: patch.status ?? p.status,
                image: patch.image ?? p.image,
              }
            : p,
        ),
      })
      sync(set)
    },

    deleteProduct: (websiteId, id) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      useCampaignStore.getState().updateCampaign(websiteId, {
        products: c.products.filter((p) => p.id !== id),
      })
      sync(set)
    },

    addAsset: (websiteId, name, folder, type, sizeKb) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      useCampaignStore.getState().updateCampaign(websiteId, {
        assets: [
          ...c.assets,
          {
            id: uid('ast'),
            name,
            type,
            folder,
            sizeKb,
            url: '',
            uploadedAt: new Date().toISOString(),
          },
        ],
      })
      sync(set)
    },

    deleteAsset: (websiteId, id) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      useCampaignStore.getState().updateCampaign(websiteId, {
        assets: c.assets.filter((a) => a.id !== id),
      })
      sync(set)
    },

    markAllNotificationsRead: () => {},
    updateTranslation: (websiteId, key, lang, value) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      // Upsert: brand-new campaigns start with `translations: []` (see
      // platform/store.ts createCampaign), so a key may not exist yet.
      const exists = c.translations.some((t) => t.key === key)
      const translations = exists
        ? c.translations.map((t) => (t.key === key ? { ...t, [lang]: value } : t))
        : [...c.translations, { id: uid('tr'), key, fr: lang === 'fr' ? value : '', ar: lang === 'ar' ? value : '' }]
      useCampaignStore.getState().updateCampaign(websiteId, { translations })
      sync(set)
    },
  }
})

// Re-export helpers used elsewhere in the admin.
export { uid, iso, buildMarjaneCampaign }
