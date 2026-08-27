/*
  Repository Pattern — the interface between the UI and the data layer.

  The UI NEVER depends directly on localStorage / fetch / SQLite. It only
  depends on this `CampaignRepository` interface. Swapping the storage
  backend (LocalStorage today → REST API tomorrow → production DB later)
  is a one-line change in `store.ts`.

  
  Key design decision: the public site and the admin both consume the SAME
  repository, so the admin-edited campaign is automatically what the website
  renders — no more disconnected, duplicated data.
*/

import type { Campaign } from './types'

export interface CampaignRepository {
  list(): Campaign[]
  get(id: string): Campaign | undefined
  getBySlug(slug: string): Campaign | undefined
  create(campaign: Campaign): void
  update(campaign: Campaign): void
  delete(id: string): void
}

// Exported so `store.ts` can recognize this key on the browser's `storage`
// event (fired in every OTHER tab/window on the same origin whenever one tab
// writes to localStorage) and refresh its in-memory state to match — without
// this, an edit made in an admin tab never reaches an already-open public
// `/marjane` tab until that tab is manually reloaded.
export const STORAGE_KEY = 'campaignhub.campaigns.v1'

/**
 * LocalStorage-backed repository. This is the "today" implementation.
 * It is a drop-in that can be replaced by ApiCampaignRepository below.
 */
export class LocalCampaignRepository implements CampaignRepository {
  private read(): Campaign[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Campaign[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private write(campaigns: Campaign[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
  }

  list(): Campaign[] {
    return this.read()
  }

  get(id: string): Campaign | undefined {
    return this.read().find((c) => c.id === id)
  }

  getBySlug(slug: string): Campaign | undefined {
    return this.read().find((c) => c.slug === slug)
  }

  create(campaign: Campaign): void {
    const all = this.read()
    all.unshift(campaign)
    this.write(all)
  }

  update(campaign: Campaign): void {
    const all = this.read()
    const idx = all.findIndex((c) => c.id === campaign.id)
    if (idx === -1) return
    all[idx] = campaign
    this.write(all)
  }

  delete(id: string): void {
    this.write(this.read().filter((c) => c.id !== id))
  }

  /** Seed / replace the whole store (used by migrations + seed). */
  seed(campaigns: Campaign[]): void {
    this.write(campaigns)
  }
}

/**
 * REST API-backed repository. Wire this up in Phase 5 when the FastAPI
 * backend is ready. The UI does not change at all when this is swapped in.
 *
 * The store is synchronous (zustand), so the repository keeps an in-memory
 * cache hydrated from the API on construction and after each mutation. Swapping
 * Local → Api is a one-line change in `repository.ts` at the bottom.
 */
export class ApiCampaignRepository implements CampaignRepository {
  private base: string
  private cache: Campaign[] = []
  private hydrated = false

  constructor(base = '/api') {
    this.base = base
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return
    try {
      const res = await fetch(`${this.base}/campaigns`)
      if (res.ok) {
        this.cache = (await res.json()) as Campaign[]
        this.hydrated = true
      }
    } catch {
      this.cache = []
    }
  }

  private async flush(): Promise<void> {
    this.hydrated = true
    try {
      const res = await fetch(`${this.base}/campaigns`)
      if (res.ok) this.cache = (await res.json()) as Campaign[]
    } catch {
      /* keep cache */
    }
  }

  list(): Campaign[] {
    void this.ensureHydrated()
    return this.cache
  }

  get(id: string): Campaign | undefined {
    void this.ensureHydrated()
    return this.cache.find((c) => c.id === id)
  }

  getBySlug(slug: string): Campaign | undefined {
    void this.ensureHydrated()
    return this.cache.find((c) => c.slug === slug)
  }

  create(campaign: Campaign): void {
    this.cache.unshift(campaign)
    void fetch(`${this.base}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    }).then(() => this.flush())
  }

  update(campaign: Campaign): void {
    this.cache = this.cache.map((c) => (c.id === campaign.id ? campaign : c))
    void fetch(`${this.base}/campaigns/${campaign.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    }).then(() => this.flush())
  }

  delete(id: string): void {
    this.cache = this.cache.filter((c) => c.id !== id)
    void fetch(`${this.base}/campaigns/${id}`, { method: 'DELETE' }).then(() => this.flush())
  }
}

/** The active repository. Swap here to move to the API. */
export const repository: CampaignRepository = new LocalCampaignRepository()
