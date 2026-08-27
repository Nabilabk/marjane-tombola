import { useEffect } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import './admin.css'
import Login from './pages/Login'
import PlatformDashboard from './pages/PlatformDashboard'
import CreateWebsiteWizard from './pages/CreateWebsiteWizard'
import WorkspaceRoot from './pages/WorkspaceRoot'
import Overview from './pages/workspace/Overview'
import ThemeEditor from './pages/workspace/ThemeEditor'
import Pages from './pages/workspace/Pages'
import Campaigns from './pages/workspace/Campaigns'
import Products from './pages/workspace/Products'
import Assets from './pages/workspace/Assets'
import Notifications from './pages/workspace/Notifications'
import Settings from './pages/workspace/Settings'
import Team from './pages/Team'
import { RequireAuth } from './components/RequireAuth'
import { RequireSuperAdmin } from './components/RequireSuperAdmin'
import { RequireCampaignAccess } from './components/RequireCampaignAccess'
import { AdminLangProvider } from './lib/adminI18n'
import { resetAdminSiteChrome } from '../engine/theme'

// Prizes, Rewards, Tickets, Participants, Analytics and Languages used to be
// six separate sidebar pages. They're now tabs on Dashboard (Overview) and
// Website Builder (Pages) — see those files. These redirects just keep any
// old bookmark/link pointed at the right tab instead of 404ing.
function TabRedirect({ to, tab }: { to: '' | 'pages'; tab: string }) {
  const { siteId } = useParams()
  return <Navigate to={`/admin/site/${siteId}${to ? `/${to}` : ''}?tab=${tab}`} replace />
}

export default function AdminApp() {
  // Safety net: without this, dropping a file anywhere in the admin that
  // ISN'T one of our own drop zones falls through to the browser's default
  // behavior — navigating away to display the raw file, which blanks out
  // the whole app. Individual drop zones (MediaPicker, Assets) still handle
  // + preventDefault their own `drop` event for the actual upload; this
  // just stops the *rest* of the page from also reacting to it.
  useEffect(() => {
    function preventDefault(e: DragEvent) {
      e.preventDefault()
    }
    window.addEventListener('dragover', preventDefault)
    window.addEventListener('drop', preventDefault)
    return () => {
      window.removeEventListener('dragover', preventDefault)
      window.removeEventListener('drop', preventDefault)
    }
  }, [])

  // The admin tab must always stay "Marjane Campaign Studio" with the
  // Marjane mark — never a visited campaign's own name/logo (that's the
  // public site's job, see App.tsx/PublicCampaign.tsx). This only matters
  // for a same-tab SPA navigation landing here right after a public
  // `/:slug` route set the tab chrome to that campaign's branding; a fresh
  // load already has the right defaults from index.html.
  useEffect(() => {
    resetAdminSiteChrome()
  }, [])

  return (
    <AdminLangProvider>
    <div className="admin-shell">
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          path=""
          element={
            <RequireAuth>
              <RequireSuperAdmin>
                <PlatformDashboard />
              </RequireSuperAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="create"
          element={
            <RequireAuth>
              <RequireSuperAdmin>
                <CreateWebsiteWizard />
              </RequireSuperAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="team"
          element={
            <RequireAuth>
              <RequireSuperAdmin>
                <Team />
              </RequireSuperAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="site/:siteId"
          element={
            <RequireAuth>
              <RequireCampaignAccess>
                <WorkspaceRoot />
              </RequireCampaignAccess>
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="theme" element={<ThemeEditor />} />
          <Route path="pages" element={<Pages />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="products" element={<Products />} />
          <Route path="assets" element={<Assets />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />

          {/* Old top-level pages, now tabs — redirect so nothing 404s. */}
          <Route path="tickets" element={<TabRedirect to="" tab="tickets" />} />
          <Route path="participants" element={<TabRedirect to="" tab="participants" />} />
          <Route path="analytics" element={<TabRedirect to="" tab="analytics" />} />
          <Route path="prizes" element={<TabRedirect to="pages" tab="prizes" />} />
          <Route path="rewards" element={<TabRedirect to="pages" tab="prizes" />} />
          <Route path="languages" element={<TabRedirect to="pages" tab="languages" />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>

      {/* Dialog (components/ui/Dialog.tsx) portals here instead of straight to
          document.body — document.body sits OUTSIDE this div, so none of the
          --pf-* theme variables above (scoped to .admin-shell on purpose, so
          they don't leak into the public-facing site) would reach it. That
          previously made every dialog's var(--pf-*) background fall back to
          transparent — e.g. a primary button rendering as a blank white box
          with invisible white text. */}
      <div id="pf-portal-root" />
    </div>
    </AdminLangProvider>
  )
}
