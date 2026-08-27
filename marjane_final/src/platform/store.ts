/*
  Platform Store — the single zustand store for the whole platform.

  It consumes the CampaignRepository (dependency injection) and exposes
  actions that the admin editors + the public engine both call. The UI never
  touches localStorage directly — it only talks to this store.

  This replaces the old `admin/lib/store.ts` (which was disconnected from the
  real website and seeded fake data).
*/

import { create } from 'zustand'
import { repository, STORAGE_KEY } from './repository'
import { buildMarjaneCampaign } from './seed'
import { migrateLegacyPlan } from './migrations'
import { uniformProbabilities } from './probabilities'
import { saveCampaignLifecycle } from './campaignLifecycleApi'
import { t as defaultDict } from '../tombola/i18n'
import type {
  Campaign,
  CampaignStatus,
  CampaignSchedule,
  CampaignTheme,
  Participant,
  Ticket,
  Notification,
  ActivityItem,
} from './types'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

// Seeded into every new campaign's `translations` (not left for the
// defaultDict fallback alone) so they show up pre-filled and editable in
// the admin's Languages tab from day one — see engine/CampaignEngine.tsx's
// lifecycle gate, which reads these by key.
const LIFECYCLE_TRANSLATION_KEYS = [
  'campaignEndedTitle',
  'campaignEndedMessage',
  'campaignMaintenanceTitle',
  'campaignMaintenanceMessage',
] as const

function seedLifecycleTranslations(): Campaign['translations'] {
  return LIFECYCLE_TRANSLATION_KEYS.map((key) => ({
    id: uid('tr'),
    key,
    fr: defaultDict[key].fr,
    ar: defaultDict[key].ar,
  }))
}

function iso(daysAgo: number, hour = 10) {
  const d = new Date(Date.now() - daysAgo * 86400000)
  d.setHours(hour, 12, 0, 0)
  return d.toISOString()
}

interface PlatformState {
  campaigns: Campaign[]
  participants: Participant[]
  tickets: Ticket[]
  notifications: Notification[]
  activity: ActivityItem[]

  // undo / redo
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void

  // derived selectors
  getCampaign: (id: string) => Campaign | undefined
  getCampaignBySlug: (slug: string) => Campaign | undefined

  // campaign lifecycle
  createCampaign: (input: {
    name: string
    slug: string
    description: string
    template: Campaign['template']
    language: Campaign['language']
    theme: Partial<CampaignTheme>
  }) => string
  updateCampaign: (id: string, patch: Partial<Campaign>) => void
  updateCampaignStatus: (id: string, status: CampaignStatus) => void
  /** Toggles the temporary pause independent of `status` (see Campaign.maintenanceMode)
   * — also pushes the change to the backend (campaignLifecycleApi.ts) since
   * that's what actually blocks gameplay, not the local store alone. */
  updateMaintenanceMode: (id: string, on: boolean) => void
  /** Patches the campaign's start/end date+time — also pushes `end_date` to
   * the backend, which is what `_lifecycle_block` checks server-side. */
  updateSchedule: (id: string, patch: Partial<CampaignSchedule>) => void
  updateTheme: (id: string, patch: Partial<CampaignTheme>) => void
  updateBrand: (id: string, patch: Partial<Campaign['brand']>) => void
  updateGame: (id: string, patch: Partial<Campaign['game']>) => void
  updatePage: (id: string, pageId: string, patch: Partial<Campaign['pages'][number]>) => void
  deleteCampaign: (id: string) => void
  duplicateCampaign: (id: string) => void

  // child collections
  participantsFor: (campaignId: string) => Participant[]
  ticketsFor: (campaignId: string) => Ticket[]
  notificationsFor: (campaignId: string) => Notification[]
  activityFor: (campaignId: string) => ActivityItem[]
  markAllNotificationsRead: (campaignId: string) => void
}

// --------------------------------------------------------------------------
// Undo / redo — a linear history of `campaigns` snapshots. Every mutating
// action below (createCampaign/updateCampaign/deleteCampaign/duplicateCampaign)
// pushes the PRE-mutation snapshot onto `past` before applying its change.
// `updateCampaign` is the one every admin editor (theme, brand, game, pages,
// products, rewards, assets, translations — see admin/lib/store.ts) funnels
// through, so instrumenting these 4 primitives covers all of them.
// Kept as plain module state rather than reactive zustand fields, so pushing
// a history entry doesn't itself cause a re-render — only the cheap
// `canUndo`/`canRedo` booleans are mirrored into the store.
// --------------------------------------------------------------------------
const MAX_HISTORY = 30
let past: Campaign[][] = []
let future: Campaign[][] = []

function pushHistory(snapshot: Campaign[]) {
  past.push(snapshot)
  if (past.length > MAX_HISTORY) past.shift()
  future = []
}

/** Reconcile the repository (localStorage today, API later) with a restored snapshot. */
function syncRepository(target: Campaign[], from: Campaign[]) {
  const fromIds = new Set(from.map((c) => c.id))
  const targetIds = new Set(target.map((c) => c.id))
  for (const c of target) {
    if (fromIds.has(c.id)) repository.update(c)
    else repository.create(c)
  }
  for (const id of fromIds) {
    if (!targetIds.has(id)) repository.delete(id)
  }
}

/** Seed or migrate the repository on first load. */
function ensureSeed() {
  const existing = repository.list()
  if (existing.length > 0) return

  // Migrate any data the user created in the old admin (Website model).
  const migrated = migrateLegacyPlan()
  if (migrated.length > 0) {
    migrated.forEach((c) => repository.create(c))
    return
  }

  // Otherwise seed Campaign #1 = the real Marjane website.
  repository.create(buildMarjaneCampaign())
}

/** Backfills fields added to Campaign after a given campaign was first
 * created (unlike `ensureSeed`'s legacy-format migration, this runs on
 * EVERY load, not just an empty repository) — a campaign saved before
 * `maintenanceMode` or the lifecycle-gate translations existed would
 * otherwise carry `undefined` where the rest of the app expects a real
 * boolean/string (see CampaignEngine.tsx's isEnded/isMaintenance gate). */
function backfillLifecycleFields() {
  for (const c of repository.list()) {
    const patch: Partial<Campaign> = {}
    if (typeof c.maintenanceMode !== 'boolean') patch.maintenanceMode = false

    const existingKeys = new Set(c.translations.map((tr) => tr.key))
    const missingKeys = LIFECYCLE_TRANSLATION_KEYS.filter((k) => !existingKeys.has(k))
    if (missingKeys.length > 0) {
      patch.translations = [
        ...c.translations,
        ...missingKeys.map((key) => ({ id: uid('tr'), key, fr: defaultDict[key].fr, ar: defaultDict[key].ar })),
      ]
    }

    if (Object.keys(patch).length > 0) repository.update({ ...c, ...patch })
  }
}

// Cross-tab sync: each browser tab/window that loads this module gets its
// own in-memory zustand instance, seeded once from `repository.list()` at
// creation time. Editing a campaign in an admin tab writes straight to
// localStorage, but an already-open public `/marjane` tab has no way to
// know that happened — `set()` calls only notify subscribers within the
// SAME JS runtime. The browser's `storage` event is the platform's own
// mechanism for this: it fires in every OTHER tab on the same origin
// whenever one tab writes to the watched localStorage key (never in the
// tab that made the write), so re-reading the repository here is what
// makes an admin edit show up on an already-open public tab without a
// manual refresh.
function subscribeToCrossTabChanges(set: (partial: Partial<PlatformState>) => void) {
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    set({ campaigns: repository.list() })
  })
}

export const usePlatformStore = create<PlatformState>()((set, get, _store) => {
  ensureSeed()
  backfillLifecycleFields()
  subscribeToCrossTabChanges(set)

  return {
    campaigns: repository.list(),
    participants: [],
    tickets: [],
    notifications: [],
    activity: [],

    canUndo: false,
    canRedo: false,

    undo: () => {
      if (past.length === 0) return
      const current = get().campaigns
      const previous = past.pop()!
      future.push(current)
      syncRepository(previous, current)
      set({ campaigns: previous, canUndo: past.length > 0, canRedo: true })
    },

    redo: () => {
      if (future.length === 0) return
      const current = get().campaigns
      const next = future.pop()!
      past.push(current)
      syncRepository(next, current)
      set({ campaigns: next, canRedo: future.length > 0, canUndo: true })
    },

    getCampaign: (id) => get().campaigns.find((c) => c.id === id),
    getCampaignBySlug: (slug) => get().campaigns.find((c) => c.slug === slug),

    createCampaign: (input) => {
      pushHistory(get().campaigns)
      set({ canUndo: true, canRedo: false })
      const id = uid('camp')
      const now = new Date().toISOString()
      const theme: CampaignTheme = {
        primary: '#17181C',
        secondary: '#9B9EA7',
        accent: '#2D6BE7',
        font: 'display',
        radius: 12,
        buttonStyle: 'solid',
        buttonSize: 'md',
        animationLevel: 'subtle',
        shadowIntensity: 'soft',
        spacing: 'comfortable',
        borderWidth: 1,
        darkMode: false,
        backgroundImageUrl: '',
        logoUrl: '',
        faviconUrl: '',
        heroImageUrl: '',
        brandImages: [],
        ...input.theme,
      }
      const campaign: Campaign = {
        id,
        name: input.name,
        slug: input.slug,
        status: 'draft',
        maintenanceMode: false,
        description: input.description,
        template: input.template,
        language: input.language,
        createdAt: now,
        updatedAt: now,
        domain: `promo.company.com/${input.slug}`,
        brand: {
          name: input.name,
          tagline: '',
          logoUrl: '',
          faviconUrl: '',
          productLine: '',
          packshot: '',
          colors: { primary: theme.primary, secondary: theme.secondary, accent: theme.accent },
        },
        theme,
        pages: [],
        game: {
          id: 'cards',
          name: 'Cards',
          enabled: true,
          settings: { cardCount: 9, maxPickLimit: 6, rounds: 6 },
          prizes: [0, 0, 0, 0, 0, 0, 0, 0],
          probabilities: uniformProbabilities(8),
          pickLimit: 3,
        },
        products: [],
        prizes: [],
        assets: [],
        translations: seedLifecycleTranslations(),
        schedule: {
          startDate: now.slice(0, 10),
          startTime: '00:00',
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          endTime: '23:59',
        },
        permissions: { owner: 'admin@campaignhub.ma', editors: [], viewers: [] },
        analytics: {
          participants: 0,
          validatedTickets: 0,
          rejectedTickets: 0,
          winningTickets: 0,
          dailyScans: 0,
          conversionRate: 0,
          topProducts: [],
          topStores: [],
          languages: { fr: 0, ar: 0, en: 0 },
          devices: { mobile: 0, desktop: 0 },
        },
      }
      repository.create(campaign)
      set((s) => ({ campaigns: [campaign, ...s.campaigns] }))
      return id
    },

    updateCampaign: (id, patch) => {
      const current = get().campaigns.find((c) => c.id === id)
      if (!current) return
      pushHistory(get().campaigns)
      const updated = { ...current, ...patch, updatedAt: new Date().toISOString() }
      repository.update(updated)
      set((s) => ({
        campaigns: s.campaigns.map((c) => (c.id === id ? updated : c)),
        canUndo: true,
        canRedo: false,
      }))
    },

    updateCampaignStatus: (id, status) => {
      get().updateCampaign(id, { status })
      // 'ended'/'archived' are the two lifecycle statuses that mean "stop
      // taking plays, permanently" — every other status (draft, ready,
      // scheduled, published, live) leaves gameplay open, since a campaign
      // that hasn't been explicitly ended shouldn't be blocked just for not
      // being fully launched yet. Fire-and-forget: see campaignLifecycleApi.ts.
      const c = get().campaigns.find((c) => c.id === id)
      if (c) {
        const active = status !== 'ended' && status !== 'archived'
        void saveCampaignLifecycle(c.slug, { active })
      }
    },

    updateMaintenanceMode: (id, on) => {
      get().updateCampaign(id, { maintenanceMode: on })
      const c = get().campaigns.find((c) => c.id === id)
      if (c) void saveCampaignLifecycle(c.slug, { maintenance_mode: on })
    },

    updateSchedule: (id, patch) => {
      const current = get().campaigns.find((c) => c.id === id)
      if (!current) return
      const schedule = { ...current.schedule, ...patch }
      get().updateCampaign(id, { schedule })
      // Combined into one ISO datetime so it compares correctly against the
      // backend's `now.isoformat()` string comparison in _lifecycle_block —
      // a bare date (no time) would sort as "midnight", ending the campaign
      // a full day early.
      const endIso = new Date(`${schedule.endDate}T${schedule.endTime || '23:59'}:00`).toISOString()
      void saveCampaignLifecycle(current.slug, { end_date: endIso })
    },

    updateTheme: (id, patch) => {
      const current = get().campaigns.find((c) => c.id === id)
      if (!current) return
      get().updateCampaign(id, { theme: { ...current.theme, ...patch } })
    },

    updateBrand: (id, patch) => {
      const current = get().campaigns.find((c) => c.id === id)
      if (!current) return
      get().updateCampaign(id, { brand: { ...current.brand, ...patch } })
    },

    updateGame: (id, patch) => {
      const current = get().campaigns.find((c) => c.id === id)
      if (!current) return
      get().updateCampaign(id, { game: { ...current.game, ...patch } })
    },

    updatePage: (id, pageId, patch) => {
      const current = get().campaigns.find((c) => c.id === id)
      if (!current) return
      const pages = current.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p))
      get().updateCampaign(id, { pages })
    },

    deleteCampaign: (id) => {
      pushHistory(get().campaigns)
      repository.delete(id)
      set((s) => ({
        campaigns: s.campaigns.filter((c) => c.id !== id),
        participants: s.participants.filter((p) => p.campaignId !== id),
        tickets: s.tickets.filter((t) => t.campaignId !== id),
        notifications: s.notifications.filter((n) => n.campaignId !== id),
        activity: s.activity.filter((a) => a.campaignId !== id),
        canUndo: true,
        canRedo: false,
      }))
    },

    duplicateCampaign: (id) => {
      const src = get().campaigns.find((c) => c.id === id)
      if (!src) return
      pushHistory(get().campaigns)
      const now = new Date().toISOString()
      const copy: Campaign = {
        ...src,
        id: uid('camp'),
        name: `${src.name} (copie)`,
        slug: `${src.slug}-copy`,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      }
      repository.create(copy)
      set((s) => ({ campaigns: [copy, ...s.campaigns], canUndo: true, canRedo: false }))
    },

    participantsFor: (campaignId) => get().participants.filter((p) => p.campaignId === campaignId),
    ticketsFor: (campaignId) => get().tickets.filter((t) => t.campaignId === campaignId),
    notificationsFor: (campaignId) => get().notifications.filter((n) => n.campaignId === campaignId),
    activityFor: (campaignId) => get().activity.filter((a) => a.campaignId === campaignId),
    markAllNotificationsRead: (campaignId) =>
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.campaignId === campaignId ? { ...n, read: true } : n,
        ),
      })),
  }
})

// Re-export a helper for tests / migrations
export { iso, uid }
