/**
 * Turns real backend activity into admin notifications — the platform has no
 * push channel, so this polls `/api/admin/participations` (the same endpoint
 * ParticipantsTab/analytics already use) for a given website's campaign and
 * turns new rows into notifications, plus a one-off "campaign finished"
 * notification once the campaign's own schedule/status says it has ended.
 *
 * Idempotent by design: every notification gets a stable id derived from the
 * source event (`participant-{id}` / `winner-{id}` / `ended-{websiteId}`), and
 * `addNotification` (platform/store.ts) no-ops if that id already exists — so
 * re-polling on an interval never duplicates an already-seen notification.
 * Respects the admin's per-campaign preferences (Settings → Notifications
 * tab, see notificationPrefs.ts): a disabled type is simply never generated.
 *
 * "Invalid ticket" and "low stock" have no backing data yet — a rejected
 * scan isn't persisted anywhere in the backend (see backend/app.py's
 * `validate_receipt` docstring) and prize odds carry no stock field (see
 * admin/services/prizesApi.ts) — so those two preference toggles exist and
 * persist, but genuinely have nothing to notify about until that data exists
 * server-side. No fake events are synthesized to fill the gap.
 */

import { useEffect } from 'react'
import type { Website } from './types'
import { usePlatformStore as useCampaignStore } from '../../platform/store'
import { fetchParticipations } from '../services/participationsApi'
import { getNotifPrefs } from './notificationPrefs'

const POLL_MS = 25_000
const PAGE_SIZE = 15

// Backend timestamps are naive UTC (no `Z`/offset) — appending `Z` forces the
// UTC interpretation JS would otherwise silently shift by the local offset.
// Same fix as useCampaignAnalytics.ts's `parseUtc`.
function toIsoTime(naiveUtc: string): string {
  const d = new Date(naiveUtc.endsWith('Z') ? naiveUtc : `${naiveUtc}Z`)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function useNotificationFeed(website: Website | undefined) {
  const addNotification = useCampaignStore((s) => s.addNotification)

  useEffect(() => {
    if (!website) return
    let cancelled = false

    async function tick() {
      const site = website!
      const prefs = getNotifPrefs(site.id)

      if (prefs.campaignFinished && site.status === 'ended') {
        addNotification({
          id: `ended-${site.id}`,
          campaignId: site.id,
          title: 'Campagne terminée',
          detail: `« ${site.name} » est arrivée à son terme.`,
          time: new Date().toISOString(),
          type: 'warning',
        })
      }

      if (!prefs.newParticipant && !prefs.newWinner) return
      try {
        const page = await fetchParticipations(site.slug, { page: 1, page_size: PAGE_SIZE })
        if (cancelled) return
        for (const p of page.items) {
          const who = p.full_name?.trim() || p.phone_number
          if (p.is_winner) {
            if (!prefs.newWinner) continue
            addNotification({
              id: `winner-${p.id}`,
              campaignId: site.id,
              title: 'Nouveau gagnant',
              detail: `${who} a gagné ${p.prize_fr || 'un lot'}.`,
              time: toIsoTime(p.participation_date),
              type: 'success',
            })
          } else if (prefs.newParticipant) {
            addNotification({
              id: `participant-${p.id}`,
              campaignId: site.id,
              title: 'Nouveau participant',
              detail: `${who} vient de participer.`,
              time: toIsoTime(p.participation_date),
              type: 'info',
            })
          }
        }
      } catch {
        // Backend unreachable this tick — the next interval retries.
      }
    }

    tick()
    const interval = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [website?.id, website?.slug, website?.status, website?.name, addNotification])
}
