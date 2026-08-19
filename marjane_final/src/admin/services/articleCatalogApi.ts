/**
 * Talks directly to the backend's article-catalog + product-rules endpoints.
 *
 * NOTE: this deliberately bypasses `usePlatformStore`/`platform/store.ts`
 * (which only ever persists to localStorage — see `platform/repository.ts`,
 * where `ApiCampaignRepository` is written but never used). The live OCR
 * receipt-validation flow (`backend/app.py` /api/receipt/validate) only
 * ever reads the backend's "active campaign" row, so this module talks to
 * it directly — same pattern as `tombola/services/receiptApi.ts`.
 */

import { authFetch } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface CatalogArticle {
  code: string
  gencode: string | null
  libelle: string
  marq: string | null
  fournisseur: string | null
  price: number | null
  rayon: string | null
  famille: string | null
}

export interface ArticleSearchResult {
  items: CatalogArticle[]
  total: number
  page: number
  page_size: number
}

export type RuleType = 'quantity' | 'price'

export interface ArticleRule extends CatalogArticle {
  ruleType?: RuleType
  threshold?: number
}

export interface CombinedRule {
  ruleType: RuleType
  threshold: number
}

export interface ProductRules {
  mode: 'per_article' | 'combined'
  articles: ArticleRule[]
  combinedRule: CombinedRule | null
  /** per_article mode only: how many of `articles` must individually satisfy
   * their own rule for the receipt to qualify. 1 = any one qualifies (OR). */
  minMatches: number
}

export function emptyProductRules(): ProductRules {
  return { mode: 'per_article', articles: [], combinedRule: null, minMatches: 1 }
}

export async function fetchBrands(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/admin/articles/brands`)
  if (!res.ok) throw new Error(`Failed to load brands (${res.status})`)
  return (await res.json()).brands
}

export async function fetchFournisseurs(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/admin/articles/fournisseurs`)
  if (!res.ok) throw new Error(`Failed to load fournisseurs (${res.status})`)
  return (await res.json()).fournisseurs
}

export async function fetchRayons(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/admin/articles/rayons`)
  if (!res.ok) throw new Error(`Failed to load rayons (${res.status})`)
  return (await res.json()).rayons
}

export async function searchArticles(params: {
  brand?: string
  fournisseur?: string
  rayon?: string
  q?: string
  /** EAN/barcode prefix — matches CatalogArticle.gencode. */
  gencode?: string
  page?: number
  page_size?: number
}): Promise<ArticleSearchResult> {
  const qs = new URLSearchParams()
  if (params.brand) qs.set('brand', params.brand)
  if (params.fournisseur) qs.set('fournisseur', params.fournisseur)
  if (params.rayon) qs.set('rayon', params.rayon)
  if (params.q) qs.set('q', params.q)
  if (params.gencode) qs.set('gencode', params.gencode)
  qs.set('page', String(params.page ?? 1))
  qs.set('page_size', String(params.page_size ?? 25))

  const res = await fetch(`${API_BASE}/api/admin/articles?${qs.toString()}`)
  if (!res.ok) throw new Error(`Failed to search articles (${res.status})`)
  return res.json()
}

/** Ceiling for a single "select all matching filter" fetch — matches the
 * server-side cap in `catalog.search_articles`. A filter this broad (e.g.
 * an entire rayon) is already an edge case; beyond it we ask the admin to
 * narrow the filter rather than silently truncate a "select all" click. */
export const SELECT_ALL_CAP = 3000

/**
 * Fetches every article matching the given filters in one request, for the
 * article picker's "Select all matching" button — one click has to add the
 * whole filtered set (which can span many pages), not just the page on
 * screen. `truncated` is true when the filter matched more than
 * `SELECT_ALL_CAP` articles, so the caller can warn the admin to narrow it.
 */
export async function fetchAllMatchingArticles(params: {
  brand?: string
  fournisseur?: string
  rayon?: string
  q?: string
  gencode?: string
}): Promise<{ items: CatalogArticle[]; total: number; truncated: boolean }> {
  const result = await searchArticles({ ...params, page: 1, page_size: SELECT_ALL_CAP })
  return { items: result.items, total: result.total, truncated: result.total > result.items.length }
}

/**
 * Hydrates bare article codes (e.g. from a pasted/imported CSV) into full
 * catalog rows. Codes not found in the catalog are simply absent from the
 * result — callers diff the input codes against `items` to report misses.
 */
export async function lookupArticlesByCodes(codes: string[]): Promise<CatalogArticle[]> {
  if (codes.length === 0) return []
  const res = await fetch(`${API_BASE}/api/admin/articles/by-codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codes }),
  })
  if (!res.ok) throw new Error(`Failed to look up articles (${res.status})`)
  return (await res.json()).items
}

export async function getProductRules(slug: string): Promise<ProductRules> {
  const res = await authFetch(`${API_BASE}/api/admin/campaign/product-rules?slug=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error(`Failed to load product rules (${res.status})`)
  return res.json()
}

export async function saveProductRules(slug: string, rules: ProductRules): Promise<ProductRules> {
  const res = await authFetch(`${API_BASE}/api/admin/campaign/product-rules?slug=${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `Failed to save product rules (${res.status})`)
  }
  return res.json()
}
