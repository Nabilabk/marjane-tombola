/**
 * Talks directly to the backend's prize-odds endpoint (`backend/app.py`'s
 * `prizes` table — amount + weight, keyed to the active campaign).
 *
 * Same reason as `articleCatalogApi.ts`: `usePlatformStore` only ever
 * persists to localStorage (see `platform/repository.ts`), but the actual
 * Cards/Cups draw (`/api/play`) is server-authoritative and reads this
 * table directly. Editing a prize's probability in the admin has to reach
 * here for the live draw to change, not just the local preview.
 */

import { authFetch } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface PrizeOdds {
  amount: number
  probability: number
}

export async function getPrizeOdds(slug: string): Promise<PrizeOdds[]> {
  const res = await authFetch(`${API_BASE}/api/admin/prizes?slug=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error(`Failed to load prize odds (${res.status})`)
  return (await res.json()).prizes
}

export async function savePrizeOdds(slug: string, prizes: PrizeOdds[]): Promise<PrizeOdds[]> {
  const res = await authFetch(`${API_BASE}/api/admin/prizes?slug=${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prizes }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `Failed to save prize odds (${res.status})`)
  }
  return (await res.json()).prizes
}
