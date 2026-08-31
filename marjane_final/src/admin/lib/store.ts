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
import { isPastEndDate } from '../../platform/schedule'
import type {
  Campaign as PlatformCampaign,
  GameId,
  Notification as PlatformNotification,
  Asset as PlatformAsset,
} from '../../platform/types'
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

// --------------------------------------------------------------------------
// Theme-derived assets — the Assets library's Logos/Icons/Heroes/Backgrounds
// folders must show what the site is ACTUALLY using, not a static
// placeholder unrelated to the real campaign. logoUrl/faviconUrl/
// heroImageUrl/backgroundImageUrl/brandImages can be set from MANY places
// (Theme Editor, Settings, Cards/Wheel/Scratch editors, or pre-filled by the
// "new website" creation wizard from a brand preset) — rather than trying to
// intercept every one of those write paths, these entries are computed live
// from the current theme every time `assetsFor` is read, so they're always
// in sync no matter how the theme field was set. Each has a fixed,
// well-known id ('theme-logo', 'theme-favicon', 'theme-hero',
// 'theme-background', 'theme-brand-N') so `deleteAsset` can recognize one
// and clear the actual theme field (see `clearThemeAssetField`) instead of
// trying to delete a stored row that doesn't exist.
const THEME_ASSET_PREFIX = 'theme-'

// "Documents" is the single-slot folder that IS the tombola règlement PDF
// (see addAsset/deleteAsset below) — one helper so every call site agrees
// on the folder name instead of repeating the raw string.
const RULES_FOLDER = 'Documents'
function isRulesFolder(folder: string | null | undefined): boolean {
  return folder === RULES_FOLDER
}

/** Rough KB estimate from a data: URL's base64 payload (~4/3 the byte size);
 * a plain http(s) URL (e.g. a placeholder) gets a small fixed size instead. */
function dataUrlSizeKb(url: string): number {
  const comma = url.indexOf(',')
  if (url.startsWith('data:') && comma !== -1) {
    return Math.max(1, Math.round(((url.length - comma - 1) * 0.75) / 1024))
  }
  return 12
}

/** Computed fresh from `theme` on every read — see the block comment above.
 * `updatedAt` (the campaign's own, not a per-field one — the model doesn't
 * track that) stands in for "last touched". */
function computeThemeAssets(theme: WebsiteTheme, updatedAt: string): PlatformAsset[] {
  const make = (id: string, name: string, folder: string, url: string): PlatformAsset => ({
    id,
    name,
    type: 'image',
    folder,
    sizeKb: dataUrlSizeKb(url),
    url,
    uploadedAt: updatedAt,
  })
  const out: PlatformAsset[] = []
  if (theme.logoUrl) out.push(make('theme-logo', 'Logo', 'Logos', theme.logoUrl))
  if (theme.faviconUrl) out.push(make('theme-favicon', 'Favicon', 'Icons', theme.faviconUrl))
  if (theme.heroImageUrl) out.push(make('theme-hero', 'Image principale', 'Heroes', theme.heroImageUrl))
  if (theme.backgroundImageUrl) out.push(make('theme-background', 'Image de fond', 'Backgrounds', theme.backgroundImageUrl))
  theme.brandImages.forEach((img, i) => {
    if (img) out.push(make(`theme-brand-${i}`, `Image de marque ${i + 1}`, 'Logos', img))
  })
  return out
}

/** The inverse of `computeThemeAssets`: deleting a theme-mirrored tile from
 * the Assets library must clear the underlying theme field itself, or the
 * tile would just reappear (it's derived, not stored). */
function clearThemeAssetField(theme: WebsiteTheme, assetId: string): Partial<WebsiteTheme> {
  if (assetId === 'theme-logo') return { logoUrl: '' }
  if (assetId === 'theme-favicon') return { faviconUrl: '' }
  if (assetId === 'theme-hero') return { heroImageUrl: '' }
  if (assetId === 'theme-background') return { backgroundImageUrl: '' }
  const brandMatch = /^theme-brand-(\d+)$/.exec(assetId)
  if (brandMatch) {
    const idx = Number(brandMatch[1])
    return { brandImages: theme.brandImages.filter((_, i) => i !== idx) }
  }
  return {}
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
  return isPastEndDate(c.schedule.endDate, c.schedule.endTime)
}

/** Convert a platform Campaign → admin Website view. */
function campaignToWebsite(c: PlatformCampaign): Website {
  // Priority mirrors CampaignEngine.tsx's public-facing gate exactly:
  // ended > maintenance > published/draft. A 'live'/'published' campaign
  // with the admin's maintenanceMode toggle on (Settings.tsx) is NOT
  // actually reachable by visitors — see UnavailableScreen — so the badge
  // must say "Maintenance", not "Publié", while that toggle is on.
  const status: Website['status'] = isCampaignEnded(c)
    ? 'ended'
    : c.maintenanceMode
      ? 'maintenance'
      : c.status === 'live' || c.status === 'published'
        ? 'published'
        : 'draft'
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
      rulesUrl: c.theme.rulesUrl,
      showBrandName: c.theme.showBrandName,
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

/** Convert a platform Notification → admin AdminNotification view. */
function notificationToAdmin(n: PlatformNotification): AdminNotification {
  return {
    id: n.id,
    websiteId: n.campaignId,
    title: n.title,
    detail: n.detail,
    time: n.time,
    type: n.type,
    read: n.read,
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
    // Mirrors campaignToWebsite's `isCampaignEnded` check — a campaign whose
    // scheduled end date has passed drops into the "Terminée" Kanban column
    // on its own, same as its status badge does elsewhere, without needing
    // its `status` field to have been explicitly flipped to 'ended'.
    status: isCampaignEnded(c)
      ? 'finished'
      : c.status === 'live' || c.status === 'published'
        ? 'active'
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
  addAsset: (websiteId: string, name: string, folder: string, type: Asset['type'], sizeKb: number, url?: string) => void
  deleteAsset: (websiteId: string, id: string) => void
  markAllNotificationsRead: (websiteId: string) => void
  /** Removes a single notification (swipe-to-delete in the notifications UI). */
  deleteNotification: (websiteId: string, id: string) => void
  /** Clears every notification for a site ("delete all"). */
  clearNotifications: (websiteId: string) => void
  updateTranslation: (websiteId: string, key: string, lang: 'fr' | 'ar', value: string) => void
}

// Build the admin view from the unified campaign store.
function deriveView() {
  const campaignState = useCampaignStore.getState()
  const campaigns = campaignState.campaigns
  return {
    websites: campaigns.map(campaignToWebsite),
    campaigns: campaigns.map(campaignToAdminCampaign),
    notifications: campaignState.notifications.map(notificationToAdmin),
    canUndo: campaignState.canUndo,
    canRedo: campaignState.canRedo,
  }
}

// A website/campaign's status can flip to "ended"/"finished" purely because
// wall-clock time passed its schedule's end date — no store mutation
// involved (see `isCampaignEnded` above). Folding a coarse, minute-grained
// time bucket into `sync`'s idempotency key (and into `campaignsFor`'s
// memoization key below) means that lifecycle transition gets picked up by
// the periodic resync (see the `setInterval` in the store factory) instead
// of sitting stale until the admin happens to edit something else.
const TIME_BUCKET_MS = 60_000
function timeBucket(): number {
  return Math.floor(Date.now() / TIME_BUCKET_MS)
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
  // needing a separate check. Notifications aren't part of `campaigns` at
  // all (they live in their own platform-store array — see
  // platform/store.ts's `addNotification`/`markAllNotificationsRead`), so a
  // cheap signature of them (count, unread count, most-recent id) is folded
  // in too — otherwise a new notification, or mark-all-read, would never
  // propagate to the admin's mirrored `notifications` array.
  const notifSig = `${campaignState.notifications.length}:${campaignState.notifications.filter((n) => !n.read).length}:${campaignState.notifications[0]?.id ?? ''}`
  const key = `${campaigns.map((c) => `${c.id}:${c.updatedAt}`).join('|')}::${campaignState.canUndo}:${campaignState.canRedo}::${notifSig}::${timeBucket()}`
  if (key === lastSyncKey) return
  lastSyncKey = key
  const { websites, campaigns: adminCampaigns, notifications, canUndo, canRedo } = deriveView()
  set({ websites, campaigns: adminCampaigns, notifications, canUndo, canRedo })
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
// on `updatedAt` (which `updateCampaign` always bumps on any mutation — same
// signal `lastSyncKey` already relies on above), plus an optional `extraKey`
// — `campaignsFor` folds in the time bucket too, since its `status` field
// can flip purely from wall-clock time passing (see `isCampaignEnded`).
function memoizedFor<T>(
  cache: Map<string, { key: string; result: T[] }>,
  websiteId: string,
  campaign: PlatformCampaign,
  compute: () => T[],
  extraKey = '',
): T[] {
  const key = `${campaign.updatedAt}::${extraKey}`
  const cached = cache.get(websiteId)
  if (cached && cached.key === key) return cached.result
  const result = compute()
  cache.set(websiteId, { key, result })
  return result
}

const productsCache = new Map<string, { key: string; result: Product[] }>()
const assetsCache = new Map<string, { key: string; result: Asset[] }>()
const translationsCache = new Map<string, { key: string; result: Translation[] }>()
const campaignsForCache = new Map<string, { key: string; result: Campaign[] }>()

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

  // A campaign whose scheduled end date passes needs no admin action at all
  // to become "ended"/"finished" — it's purely wall-clock time, not a store
  // mutation. Nothing above re-runs `sync` for that on its own, so this is
  // what actually makes a live tombola drop into the "Terminée" Kanban
  // column (Campaigns.tsx) and its website card show "Ended" the moment its
  // deadline passes, without the admin needing to touch anything else first.
  // `sync`'s key folds in the same minute-grained `timeBucket()`, so this is
  // a cheap no-op the other 59 seconds of every minute.
  if (typeof window !== 'undefined') {
    window.setInterval(() => sync(set), 30_000)
  }

  return {
    websites: initial.websites,
    campaigns: initial.campaigns,
    assets: [],
    activity: [],
    products: [],
    notifications: initial.notifications,
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
      // `campaignToAdminCampaign`'s status depends on `timeBucket()` too
      // (isCampaignEnded) — see the periodic resync above.
      return memoizedFor(campaignsForCache, websiteId, c, () => [campaignToAdminCampaign(c)], String(timeBucket()))
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
      return memoizedFor(assetsCache, websiteId, c, () => {
        // Real uploads (Documents/règlement included) + whatever the theme
        // is actually using right now — see computeThemeAssets above. Any
        // 'theme-*' id already sitting in `c.assets` (from campaigns saved
        // by an older build that persisted these) is dropped here so it
        // doesn't shadow or duplicate the freshly-computed one.
        const manual = c.assets.filter((a) => !a.id.startsWith(THEME_ASSET_PREFIX))
        const themeAssets = computeThemeAssets(c.theme, c.updatedAt)
        return [...manual, ...themeAssets].map((a) => ({
          id: a.id,
          websiteId,
          name: a.name,
          type: a.type === 'document' ? 'document' : 'image',
          folder: a.folder,
          sizeKb: a.sizeKb,
          url: a.url,
          uploadedAt: a.uploadedAt,
        }))
      })
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
    notificationsFor: (websiteId) => get().notifications.filter((n) => n.websiteId === websiteId),
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

    addAsset: (websiteId, name, folder, type, sizeKb, url) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      const newAsset: PlatformAsset = {
        id: uid('ast'),
        name,
        type,
        folder,
        sizeKb,
        url: url ?? '',
        uploadedAt: new Date().toISOString(),
      }
      // "Documents" is a single-slot: it IS the tombola règlement the public
      // form's consent checkbox links to (see theme.rulesUrl / FormScreen.tsx).
      // Dragging a new PDF in there replaces whatever was live before, both
      // in the Assets grid and on the actual site, instead of accumulating
      // unused files nobody will ever see linked.
      const isRules = isRulesFolder(folder)
      const assets = isRules
        ? [...c.assets.filter((a) => !isRulesFolder(a.folder)), newAsset]
        : [...c.assets, newAsset]
      useCampaignStore.getState().updateCampaign(websiteId, {
        assets,
        ...(isRules ? { theme: { ...c.theme, rulesUrl: newAsset.url } } : {}),
      })
      sync(set)
    },

    deleteAsset: (websiteId, id) => {
      const c = useCampaignStore.getState().getCampaign(websiteId)
      if (!c) return
      // A theme-mirrored tile (logo/favicon/hero/background/brand image —
      // see computeThemeAssets) is derived, not stored: deleting it means
      // clearing the actual theme field, or it would just reappear on the
      // very next read.
      if (id.startsWith(THEME_ASSET_PREFIX)) {
        const theme = { ...c.theme, ...clearThemeAssetField(c.theme, id) }
        useCampaignStore.getState().updateCampaign(websiteId, { theme })
        sync(set)
        return
      }
      const target = c.assets.find((a) => a.id === id)
      const assets = c.assets.filter((a) => a.id !== id)
      // Deleting the live règlement PDF removes it from the app too — the
      // consent link on the public form disappears rather than pointing at
      // a file that no longer exists (see FormScreen.tsx).
      const isRules = isRulesFolder(target?.folder)
      useCampaignStore.getState().updateCampaign(websiteId, {
        assets,
        ...(isRules ? { theme: { ...c.theme, rulesUrl: '' } } : {}),
      })
      sync(set)
    },

    markAllNotificationsRead: (websiteId) => {
      useCampaignStore.getState().markAllNotificationsRead(websiteId)
      sync(set)
    },
    deleteNotification: (_websiteId, id) => {
      useCampaignStore.getState().deleteNotification(id)
      sync(set)
    },
    clearNotifications: (websiteId) => {
      useCampaignStore.getState().clearNotifications(websiteId)
      sync(set)
    },
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
export { uid, iso, buildMarjaneCampaign, isRulesFolder }
