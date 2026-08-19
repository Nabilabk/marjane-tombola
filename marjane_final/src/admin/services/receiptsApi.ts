/**
 * Talks directly to the backend's receipts endpoint (`backend/app.py`'s
 * `receipts` table — one row per receipt that passed OCR + duplicate +
 * minimum-amount + product-rule validation).
 *
 * Same reason as `prizesApi.ts`/`articleCatalogApi.ts`: `usePlatformStore`
 * only ever persists to localStorage, and scanned tickets never lived there
 * in the first place — every real scan lands straight in MySQL via
 * `/api/receipt/validate`. This is what backs the admin's "Tickets scanned"
 * tab.
 */

import { authFetch } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface Receipt {
  id: number
  receipt_number: string | null
  store: string | null
  total: number
  user_id: string | null
  created_at: string
}

export interface ReceiptPage {
  items: Receipt[]
  total: number
  page: number
  page_size: number
}

export async function fetchReceipts(
  slug: string,
  params: { page?: number; page_size?: number } = {},
): Promise<ReceiptPage> {
  const qs = new URLSearchParams()
  qs.set('slug', slug)
  qs.set('page', String(params.page ?? 1))
  qs.set('page_size', String(params.page_size ?? 50))
  const res = await authFetch(`${API_BASE}/api/admin/receipts?${qs.toString()}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `Failed to load receipts (${res.status})`)
  }
  return res.json()
}
