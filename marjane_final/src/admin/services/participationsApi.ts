/**
 * Talks directly to the backend's participations endpoint (`backend/app.py`'s
 * `participations` table, joined with `clients` — one row per completed
 * play: who played, whether they won, and which prize tier they drew).
 *
 * Same reason as `receiptsApi.ts`: `usePlatformStore` only ever persists to
 * localStorage, and real participants never lived there — every real play
 * lands in MySQL via `/api/participate`. This is what backs the admin's
 * "Participants" tab.
 */

import { authFetch } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface Participation {
  id: number
  client_id: number
  phone_number: string
  full_name: string | null
  prize_tier_id: number | null
  is_winner: boolean
  prize_fr: string
  prize_ar: string
  bill_image_path: string | null
  participation_date: string
}

export interface ParticipationPage {
  items: Participation[]
  total: number
  page: number
  page_size: number
}

export async function fetchParticipations(
  slug: string,
  params: { phone_number?: string; winners_only?: boolean; page?: number; page_size?: number } = {},
): Promise<ParticipationPage> {
  const qs = new URLSearchParams()
  qs.set('slug', slug)
  if (params.phone_number) qs.set('phone_number', params.phone_number)
  if (params.winners_only) qs.set('winners_only', 'true')
  qs.set('page', String(params.page ?? 1))
  qs.set('page_size', String(params.page_size ?? 50))
  const res = await authFetch(`${API_BASE}/api/admin/participations?${qs.toString()}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `Failed to load participants (${res.status})`)
  }
  return res.json()
}
