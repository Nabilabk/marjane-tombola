const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface Participation {
  id: number
  client_id: number
  phone_number: string
  prize_tier_id: number | null
  is_winner: boolean
  prize_fr: string
  prize_ar: string
  participation_date: string
}

/**
 * Records the outcome of a round the player already played (Dice/Cards/
 * Cups via /api/play, or the Wheel's local draw) against their phone
 * number — this is what makes the admin's Participants tab and prize-
 * pickup lookup (`/api/admin/clients/{phone}`) reflect real plays instead
 * of always being empty.
 *
 * Passing `amount` tells the backend "this round is already decided,
 * just log it" instead of running its own independent prize_tiers draw
 * (see ParticipateRequest.amount in backend/app.py) — the player must see
 * one single, consistent result.
 */
export async function recordParticipation(params: {
  slug: string
  phoneNumber: string
  fullName?: string
  billHash?: string
  amount: number
}): Promise<Participation> {
  const res = await fetch(`${API_BASE}/api/participate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: params.slug,
      phone_number: params.phoneNumber,
      full_name: params.fullName || null,
      bill_hash: params.billHash || null,
      amount: params.amount,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `Failed to record participation (${res.status})`)
  }
  return res.json()
}
