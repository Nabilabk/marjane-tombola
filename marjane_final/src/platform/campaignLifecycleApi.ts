/**
 * Talks directly to the backend's campaign-lifecycle endpoint — whether a
 * tombola is currently open to play (`active`/`end_date`) or paused
 * (`maintenance_mode`).
 *
 * Same reason `admin/services/articleCatalogApi.ts` bypasses this store for
 * product rules: `platform/store.ts` only ever persists to localStorage
 * (see `platform/repository.ts`), but the actual enforcement — rejecting
 * scans/plays for an ended or paused campaign — has to happen server-side
 * (`backend/app.py`'s `_lifecycle_block`), so this calls the backend
 * directly. Lives in `platform/` (not `admin/services/`) because it's
 * called from `platform/store.ts` itself — every caller of
 * `updateCampaignStatus`/`updateMaintenanceMode`/`updateSchedule`,
 * including the admin/lib/store.ts compatibility layer, gets the sync for
 * free instead of each higher-level wrapper needing to remember to call it.
 */

import { authFetch } from '../admin/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface CampaignLifecycle {
  active: boolean
  end_date: string | null
  maintenance_mode: boolean
}

/**
 * Fire-and-forget from the store's synchronous actions — a failed sync
 * here shouldn't block the local (optimistic) admin UI update, but IS
 * logged since a silent failure would mean the backend keeps accepting
 * plays for a campaign the admin believes they just ended/paused.
 */
export async function saveCampaignLifecycle(
  slug: string,
  patch: Partial<CampaignLifecycle>,
): Promise<CampaignLifecycle | null> {
  try {
    const res = await authFetch(`${API_BASE}/api/admin/campaign/lifecycle?slug=${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(`Failed to save campaign lifecycle (${res.status})`)
    return await res.json()
  } catch (err) {
    console.error('saveCampaignLifecycle failed — backend enforcement may be out of sync:', err)
    return null
  }
}
