/*
  App.tsx — legacy entry fallback.

  The public site now renders the unified CampaignEngine driven by the shared
  store. This component simply resolves the default campaign (marjane) and
  delegates to the engine. It guarantees the public site and the admin preview
  use the SAME rendering engine and the SAME data.
*/

import { usePlatformStore } from './platform/store'
import CampaignEngine from './engine/CampaignEngine'

export default function App() {
  // Default public route → Campaign #1 (the real Marjane website).
  const campaign = usePlatformStore((s) =>
    s.campaigns.find((c) => c.slug === 'marjane') ?? s.campaigns[0],
  )

  if (!campaign) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-[var(--ink-muted)]">
        No campaign available.
      </div>
    )
  }

  return <CampaignEngine campaign={campaign} />
}
