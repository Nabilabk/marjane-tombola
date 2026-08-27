/**
 * Lightweight real participant/conversion totals for dashboard cards, by
 * campaign slug — fetched from the same backend endpoint ParticipantsTab
 * and useCampaignAnalytics use, but with `page_size: 1` since only the
 * `total` field is needed here (no rows, no charting).
 *
 * Exists because `Campaign.analytics` (platform/types.ts) is a local field
 * that is seeded to all zeros and never synced from the backend — every
 * real play lands in MySQL, never in that field. Anything that reads
 * `campaign.analytics.participants` (PlatformDashboard's website cards,
 * Campaigns.tsx's kanban cards) is showing dead data stuck at 0.
 */

import { useEffect, useState } from 'react'
import { fetchParticipations } from '../services/participationsApi'

export interface LiveTotals {
  participants: number
  winners: number
  conversion: number // %
  loading: boolean
}

const LOADING: LiveTotals = { participants: 0, winners: 0, conversion: 0, loading: true }
const EMPTY: LiveTotals = { participants: 0, winners: 0, conversion: 0, loading: false }

async function fetchTotals(slug: string): Promise<LiveTotals> {
  const [participations, winners] = await Promise.all([
    fetchParticipations(slug, { page: 1, page_size: 1 }),
    fetchParticipations(slug, { page: 1, page_size: 1, winners_only: true }),
  ])
  const participants = participations.total
  const winnerCount = winners.total
  return {
    participants,
    winners: winnerCount,
    conversion: participants > 0 ? Math.round((winnerCount / participants) * 1000) / 10 : 0,
    loading: false,
  }
}

/** Real totals for several campaigns at once (PlatformDashboard's website
 * list) — one request pair per slug, all in parallel. */
export function useLiveTotalsForSlugs(slugs: string[]): Record<string, LiveTotals> {
  const key = slugs.join(',')
  const [map, setMap] = useState<Record<string, LiveTotals>>({})

  useEffect(() => {
    if (!key) return
    let cancelled = false
    Promise.all(
      key.split(',').map((slug) =>
        fetchTotals(slug)
          .then((totals): [string, LiveTotals] => [slug, totals])
          .catch((): [string, LiveTotals] => [slug, EMPTY]),
      ),
    ).then((entries) => {
      if (!cancelled) setMap(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return map
}

/** Real totals for a single campaign (a site's own Campaigns/Overview page). */
export function useLiveTotals(slug: string | undefined): LiveTotals {
  const map = useLiveTotalsForSlugs(slug ? [slug] : [])
  if (!slug) return EMPTY
  return map[slug] ?? LOADING
}
