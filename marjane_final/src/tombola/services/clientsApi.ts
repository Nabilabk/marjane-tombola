const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export interface Client {
  id: number
  phone_number: string
  full_name: string | null
  created_at: string
}

/**
 * Verifies/registers a participant by phone number before they play — the
 * first real backend touchpoint of the tombola flow (called from
 * FormScreen via CampaignEngine). Find-or-create semantics server-side:
 * this never fails just because the phone number was already seen before.
 */
export async function verifyClient(phoneNumber: string, fullName?: string): Promise<Client> {
  const res = await fetch(`${API_BASE}/api/clients/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, full_name: fullName || null }),
  })
  if (!res.ok) {
    throw new Error(`Client verification failed (${res.status})`)
  }
  return res.json()
}
