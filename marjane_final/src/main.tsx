import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import AdminApp from './admin/AdminApp'
import PublicCampaign from './public/PublicCampaign'
import './index.css'

// The platform is now ONE unified app:
//   - /admin/*  → the admin panel (create, edit, publish campaigns)
//   - /:slug    → the public campaign website (renders the SAME CampaignEngine)
//   - /         → defaults to the marjane campaign (Campaign #1)
//
// Every campaign has its own URL (promo.company.com/marjane, /coca, /samsung)
// using ONE frontend — no separate React projects are ever deployed.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/:slug" element={<PublicCampaign />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
