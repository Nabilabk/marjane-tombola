/*
  Public Campaign Route — the public website for a campaign.

  URL example:  /marjane   → renders the marjane campaign
  URL example:  /coca      → renders the coca campaign (when created)
  URL example:  /          → App.tsx fallback → marjane

  It resolves the :slug param against the shared repository/store and renders
  the SAME CampaignEngine the admin preview uses. One rendering engine, one
  source of truth — the public site always reflects admin edits instantly.
*/

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePlatformStore } from '../platform/store'
import CampaignEngine from '../engine/CampaignEngine'

export default function PublicCampaign() {
  const { slug } = useParams()
  const campaign = usePlatformStore((s) =>
    s.campaigns.find((c) => c.slug === slug),
  )
  const [notFound, setNotFound] = useState(false)

  // If the campaign doesn't exist, show a graceful 404 with a pointer to
  // the admin — this makes it clear the platform is the single source.
  useEffect(() => {
    if (!campaign) {
      const t = setTimeout(() => setNotFound(true), 250)
      return () => clearTimeout(t)
    }
    setNotFound(false)
  }, [campaign])

  if (!campaign) {
    return notFound ? (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[15px] font-semibold text-[var(--ink)]">
          Campaign not found
        </div>
        <p className="max-w-sm text-[13.5px] text-[var(--ink-muted)]">
          No campaign is published at “/{slug}”. Create or publish it from the
          admin platform.
        </p>
        <Link
          to="/admin"
          className="rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white"
          style={{ background: 'var(--brand-primary, #0c2340)' }}
        >
          Open Campaign Platform
        </Link>
      </div>
    ) : (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-[var(--ink-muted)]">
        Loading…
      </div>
    )
  }

  return <CampaignEngine campaign={campaign} />
}
