import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppErrorBoundary from './AppErrorBoundary'
import './index.css'

// Lazy, route-level: a visitor only ever needs ONE of these three at a
// time (the admin dashboard, or the public tombola engine — which pulls in
// three.js/@react-three for the 3D scratch card), but before this they all
// shipped in one ~2MB bundle regardless of which route loaded. Splitting
// them means whichever surface loads first only pays for its own code —
// meaningful on a customer's mobile data scanning a receipt in-store.
const App = lazy(() => import('./App'))
const AdminApp = lazy(() => import('./admin/AdminApp'))
const PublicCampaign = lazy(() => import('./public/PublicCampaign'))

function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--page, #fcfaf6)',
      }}
    >
      <div
        style={{
          height: 32,
          width: 32,
          borderRadius: '50%',
          border: '3px solid color-mix(in srgb, var(--brand-primary, #0c2340) 20%, transparent)',
          borderTopColor: 'var(--brand-primary, #0c2340)',
          animation: 'route-spin 0.7s linear infinite',
        }}
      />
      <style>{'@keyframes route-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}

// The platform is now ONE unified app:
//   - /admin/*  → the admin panel (create, edit, publish campaigns)
//   - /:slug    → the public campaign website (renders the SAME CampaignEngine)
//   - /         → defaults to the marjane campaign (Campaign #1)
//
// Every campaign has its own URL (promo.company.com/marjane, /coca, /samsung)
// using ONE frontend — no separate React projects are ever deployed.
//
// AppErrorBoundary wraps all three routes: an uncaught render error anywhere
// (admin or public), including a failed lazy-chunk load, shows a branded
// recovery screen instead of a blank white page.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/:slug" element={<PublicCampaign />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
)
