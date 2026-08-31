/**
 * Single source of truth for "has this end date/time already passed" —
 * previously reimplemented by hand in three places (admin/lib/store.ts's
 * `isCampaignEnded`, admin/pages/workspace/Campaigns.tsx's `isPastEndDate`,
 * and engine/CampaignEngine.tsx's `isEnded`), which meant a future fix
 * (grace period, timezone handling, different default end time) had to be
 * copy-pasted into all three by hand — easy to update two and forget the
 * third, letting the dashboard, the Campaigns board, and the public site
 * disagree about whether a campaign is actually over.
 *
 * Defaults to 23:59 when no end time is set, matching backend/app.py's
 * `_lifecycle_block`.
 */
export function isPastEndDate(endDate: string | undefined, endTime: string | undefined): boolean {
  if (!endDate) return false
  const endMs = new Date(`${endDate}T${endTime || '23:59'}:00`).getTime()
  return Date.now() > endMs
}
