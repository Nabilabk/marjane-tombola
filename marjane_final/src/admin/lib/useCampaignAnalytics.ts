import { useEffect, useMemo, useState } from 'react'
import { fetchReceipts, type Receipt } from '../services/receiptsApi'
import { fetchParticipations, type Participation } from '../services/participationsApi'

// How many of the most recent rows to pull for client-side charting (day/hour
// buckets, prize breakdown). The *totals* (participants/tickets/winners) are
// always exact — they come from each endpoint's `total` field, not from
// counting this capped list. Only the shape of the charts is based on this
// most-recent slice; a campaign with more than this many rows in a bucketed
// window would need real server-side aggregation instead, but this comfortably
// covers this platform's real-world scale.
const FETCH_LIMIT = 500

export interface DailyPoint {
  day: string
  participants: number
  tickets: number
}

export interface HourlyPoint {
  hour: string
  scans: number
}

export interface PrizeSlice {
  name: string
  value: number
}

export interface CampaignAnalytics {
  participants: number
  tickets: number
  winners: number
  conversion: number
  dailyTrend: DailyPoint[]
  hourly: HourlyPoint[]
  prizeDistribution: PrizeSlice[]
  loading: boolean
  error: string | null
}

const EMPTY: CampaignAnalytics = {
  participants: 0,
  tickets: 0,
  winners: 0,
  conversion: 0,
  dailyTrend: [],
  hourly: [],
  prizeDistribution: [],
  loading: true,
  error: null,
}

// Backend timestamps are naive UTC (`datetime.utcnow().isoformat()`, no `Z`
// or offset) — `new Date(iso)` on a string like that is parsed as LOCAL time
// by JS engines, which would silently shift every bucket by the browser's
// UTC offset. Appending `Z` forces the UTC interpretation that matches what
// the backend actually meant.
function parseUtc(iso: string): Date {
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
}

function dayKey(iso: string): string {
  return parseUtc(iso).toISOString().slice(0, 10)
}

function buildDailyTrend(receipts: Receipt[], participations: Participation[], days: number): DailyPoint[] {
  const now = new Date()
  const buckets = new Map<string, { participants: number; tickets: number }>()
  const orderedKeys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const key = d.toISOString().slice(0, 10)
    orderedKeys.push(key)
    buckets.set(key, { participants: 0, tickets: 0 })
  }
  for (const r of receipts) {
    const bucket = buckets.get(dayKey(r.created_at))
    if (bucket) bucket.tickets += 1
  }
  for (const p of participations) {
    const bucket = buckets.get(dayKey(p.participation_date))
    if (bucket) bucket.participants += 1
  }
  return orderedKeys.map((key) => ({
    day: parseUtc(`${key}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    ...buckets.get(key)!,
  }))
}

function buildHourly(receipts: Receipt[]): HourlyPoint[] {
  const counts = new Array(24).fill(0)
  for (const r of receipts) {
    counts[parseUtc(r.created_at).getUTCHours()] += 1
  }
  return counts.map((scans, h) => ({ hour: `${String(h).padStart(2, '0')}h`, scans }))
}

function buildPrizeDistribution(winners: Participation[]): PrizeSlice[] {
  const counts = new Map<string, number>()
  for (const w of winners) {
    const name = w.prize_fr || 'Prize'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
}

/**
 * Real backend analytics for the dashboard — daily participants/tickets
 * trend, hourly scan distribution, and prize-win breakdown, all derived from
 * `/api/admin/receipts` and `/api/admin/participations` (the same endpoints
 * TicketsTab/ParticipantsTab already use). Replaces `lib/mock-data.ts`'s
 * `dailyParticipation`/`prizeDistribution`/`hourlyActivity` generators, which
 * fabricated numbers via sine-wave noise regardless of real activity.
 *
 * `cityBreakdown` has no replacement here on purpose: nothing in the schema
 * (clients, receipts, participations) records a city anywhere, so there is no
 * real data to compute it from — AnalyticsTab shows its existing "no city
 * data yet" empty state instead of inventing numbers.
 */
export function useCampaignAnalytics(slug: string | undefined, days: number): CampaignAnalytics {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [receiptsTotal, setReceiptsTotal] = useState(0)
  const [participations, setParticipations] = useState<Participation[]>([])
  const [participationsTotal, setParticipationsTotal] = useState(0)
  const [winners, setWinners] = useState<Participation[]>([])
  const [winnersTotal, setWinnersTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchReceipts(slug, { page: 1, page_size: FETCH_LIMIT }),
      fetchParticipations(slug, { page: 1, page_size: FETCH_LIMIT }),
      fetchParticipations(slug, { page: 1, page_size: FETCH_LIMIT, winners_only: true }),
    ])
      .then(([receiptsPage, participationsPage, winnersPage]) => {
        if (cancelled) return
        setReceipts(receiptsPage.items)
        setReceiptsTotal(receiptsPage.total)
        setParticipations(participationsPage.items)
        setParticipationsTotal(participationsPage.total)
        setWinners(winnersPage.items)
        setWinnersTotal(winnersPage.total)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const dailyTrend = useMemo(() => buildDailyTrend(receipts, participations, days), [receipts, participations, days])
  const hourly = useMemo(() => buildHourly(receipts), [receipts])
  const prizeDistribution = useMemo(() => buildPrizeDistribution(winners), [winners])

  if (!slug) return EMPTY

  return {
    participants: participationsTotal,
    tickets: receiptsTotal,
    winners: winnersTotal,
    conversion: participationsTotal > 0 ? Math.round((winnersTotal / participationsTotal) * 1000) / 10 : 0,
    dailyTrend,
    hourly,
    prizeDistribution,
    loading,
    error,
  }
}
