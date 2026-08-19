import type { ValidationResult } from '../types/receipt'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

/**
 * Uploads a receipt image to the backend and returns the validation result.
 * This replaces the old direct-to-OCR.space call — ScanScreen no longer
 * knows anything about OCR, parsing, or validation rules.
 */
export async function uploadReceipt(file: File, slug: string, userId?: string): Promise<ValidationResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('slug', slug)
  if (userId) form.append('user_id', userId)

  const res = await fetch(`${API_BASE}/api/receipt/validate`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    throw new Error(`Receipt validation request failed (${res.status})`)
  }

  return res.json()
}
