/**
 * Talks to the backend's account-management endpoints (`backend/app.py`'s
 * `admin_users` table). Every call here requires a super_admin session —
 * the backend enforces that via `require_super_admin`; this module is only
 * reachable from `pages/Team.tsx`, which is itself gated by
 * `RequireSuperAdmin`.
 */

import { authFetch } from '../lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export type AdminRole = 'super_admin' | 'tombola_admin'

export interface AdminUser {
  id: number
  name: string
  email: string
  role: AdminRole
  campaign_slug: string | null
  active: boolean
  created_at: string
}

export interface AdminUserCreatePayload {
  name: string
  email: string
  password: string
  role: AdminRole
  campaign_slug?: string | null
}

export interface AdminUserUpdatePayload {
  name?: string
  role?: AdminRole
  campaign_slug?: string | null
  active?: boolean
  password?: string
}

async function unwrap<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `${fallback} (${res.status})`)
  }
  return res.json()
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await authFetch(`${API_BASE}/api/admin/users`)
  return unwrap(res, 'Failed to load accounts')
}

export async function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUser> {
  const res = await authFetch(`${API_BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return unwrap(res, 'Failed to create account')
}

export async function updateAdminUser(id: number, payload: AdminUserUpdatePayload): Promise<AdminUser> {
  const res = await authFetch(`${API_BASE}/api/admin/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return unwrap(res, 'Failed to update account')
}

export async function deleteAdminUser(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' })
  await unwrap(res, 'Failed to delete account')
}
