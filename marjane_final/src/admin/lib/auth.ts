/**
 * Admin auth — backed by the real FastAPI accounts in `backend/app.py`
 * (`admin_users` table, `/api/auth/login`). Two roles come back on the
 * session: `super_admin` (everything, every tombola) and `tombola_admin`
 * (exactly the one tombola named in `campaignSlug`) — see
 * `RequireSuperAdmin`/`RequireCampaignAccess` for where that's enforced on
 * the frontend, and `require_super_admin`/`require_campaign_access` in
 * `backend/app.py` for the (authoritative) backend side.
 *
 * The JWT itself is opaque here — it's only decoded locally to read `exp`
 * for an early "already expired" check; every real authorization decision
 * is made server-side when the token is sent back on the next request.
 */

const STORAGE_KEY = 'campaignhub_admin_session'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export type AdminRole = 'super_admin' | 'tombola_admin'

export interface AdminSession {
  token: string
  id: number
  email: string
  name: string
  role: AdminRole
  /** The one tombola this account may edit. Always null for super_admin. */
  campaignSlug: string | null
  loggedInAt: string
}

/** Decodes a JWT's payload without verifying the signature — verification
 * always happens server-side; this is only used to read `exp` so an
 * obviously-expired session doesn't get sent to the backend at all. */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function getSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AdminSession
    const payload = decodeJwtPayload(session.token)
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; session: AdminSession } | { ok: false; error: string }> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    })
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    return { ok: false, error: body?.detail || 'Invalid email or password.' }
  }

  const body = await res.json()
  const session: AdminSession = {
    token: body.token,
    id: body.user.id,
    email: body.user.email,
    name: body.user.name,
    role: body.user.role,
    campaignSlug: body.user.campaign_slug ?? null,
    loggedInAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return { ok: true, session }
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** `fetch` wrapper that attaches the current session's bearer token — use
 * this instead of a bare `fetch` for any admin call that mutates data, so
 * the backend's per-tombola authorization actually has a token to check. */
export function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const session = getSession()
  const headers = new Headers(init.headers)
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
  return fetch(input, { ...init, headers })
}
