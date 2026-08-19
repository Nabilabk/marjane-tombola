import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { getSession, logout } from '../lib/auth'
import { usePlatformStore } from '../lib/store'

/**
 * Gate on platform-level routes (the "all sites" dashboard, the create-site
 * wizard, team/account management) — a tombola_admin has no business seeing
 * any of these, so instead of a dead end they're sent straight to their one
 * assigned workspace.
 */
export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const session = getSession()
  const websites = usePlatformStore((s) => s.websites)

  if (!session) return <Navigate to="/admin/login" replace />
  if (session.role === 'super_admin') return <>{children}</>

  const ownSite = websites.find((w) => w.slug === session.campaignSlug)
  if (ownSite) return <Navigate to={`/admin/site/${ownSite.id}`} replace />

  // Orphaned session: a tombola_admin whose assigned site no longer exists.
  // Login unconditionally bounces any authenticated session to /admin, so
  // redirecting here without clearing the session would send them right
  // back into this same dead end — an infinite Login <-> RequireSuperAdmin
  // redirect loop. Log them out so /admin/login actually renders the form.
  logout()
  return <Navigate to="/admin/login" replace />
}
