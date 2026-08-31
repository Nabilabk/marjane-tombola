/*
  Per-campaign notification preferences — which event types the admin wants
  to see (Settings → Notifications tab, see pages/workspace/Settings.tsx).

  This is a viewer setting, not campaign data the public site reads, so it
  persists to this browser's localStorage rather than the shared campaign
  repository — same reasoning as `admin/lib/adminI18n.tsx`'s language choice.
*/

export type NotifKey = 'newParticipant' | 'newWinner' | 'invalidTicket' | 'lowStock' | 'campaignFinished'

export const NOTIF_KEYS: NotifKey[] = [
  'newParticipant',
  'newWinner',
  'invalidTicket',
  'lowStock',
  'campaignFinished',
]

const STORAGE_KEY = 'campaignhub.notifPrefs.v1'

const DEFAULTS: Record<NotifKey, boolean> = {
  newParticipant: true,
  newWinner: true,
  invalidTicket: true,
  lowStock: false,
  campaignFinished: false,
}

type PrefsMap = Record<string, Record<NotifKey, boolean>>

function readAll(): PrefsMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PrefsMap) : {}
  } catch {
    return {}
  }
}

function writeAll(map: PrefsMap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* storage full/disabled — the toggle still works for this session */
  }
}

export function getNotifPrefs(websiteId: string): Record<NotifKey, boolean> {
  return { ...DEFAULTS, ...readAll()[websiteId] }
}

export function setNotifPref(websiteId: string, key: NotifKey, value: boolean): Record<NotifKey, boolean> {
  const all = readAll()
  const next = { ...DEFAULTS, ...all[websiteId], [key]: value }
  all[websiteId] = next
  writeAll(all)
  return next
}
