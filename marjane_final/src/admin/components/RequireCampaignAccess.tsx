import { Navigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { getSession, logout } from '../lib/auth'
import { usePlatformStore } from '../lib/store'

/**
 * Gate on the `site/:siteId/*` route subtree. A super_admin passes through
 * unconditionally. A tombola_admin only passes for the one tombola whose
 * slug matches `session.campaignSlug` — any other site id bounces them to
 * their own workspace instead of ever rendering it (this mirrors, on the
 * frontend, what `require_campaign_access` already enforces server-side in
 * `backend/app.py` for every backend-connected admin call).
 */
export function RequireCampaignAccess({ children }: { children: ReactNode }) {
  const { siteId } = useParams()
  const session = getSession()
  const websites = usePlatformStore((s) => s.websites)

  if (!session) return <Navigate to="/admin/login" replace />
  if (session.role === 'super_admin') return <>{children}</>

  const currentSite = websites.find((w) => w.id === siteId)
  if (currentSite && currentSite.slug === session.campaignSlug) {
    return <>{children}</>
  }

  const ownSite = websites.find((w) => w.slug === session.campaignSlug)
  if (ownSite) return <Navigate to={`/admin/site/${ownSite.id}`} replace />

  // Orphaned session: a tombola_admin whose assigned site no longer exists.
  // Login unconditionally bounces any authenticated session to /admin, so
  // redirecting here without clearing the session would loop straight back
  // through RequireSuperAdmin/Login (see RequireSuperAdmin.tsx). Log out so
  // /admin/login actually renders the form.
  logout()
  return <Navigate to="/admin/login" replace />
}
