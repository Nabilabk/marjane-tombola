import type { ValidationResult } from '../types/receipt'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

/**
 * Downscales + re-encodes a receipt photo before upload. Modern phone
 * cameras routinely produce 3-10 MB photos, well above OCR.space's 1 MB
 * cap on its free/demo API key (see backend/app.py's OCR_API_KEY) — an
 * oversized image gets rejected by OCR.space outright, which the backend
 * surfaces as the generic 'ocr_failed' error with no connection to what's
 * actually printed on the ticket (the OCR call never even ran). Re-encoding
 * under the cap here fixes that whole class of failure regardless of which
 * OCR.space plan is configured.
 *
 * Falls back to the original file on any failure (unsupported type, canvas
 * error, …) — a failed compression attempt must never block a scan that
 * would otherwise have gone through fine.
 */
export async function compressReceiptImage(
  file: File,
  maxBytes = 950 * 1024,
  maxDimension = 1800,
): Promise<File> {
  if (file.size <= maxBytes || !file.type.startsWith('image/')) return file

  try {
    const img = await loadImage(file)
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const toBlob = (quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

    let quality = 0.9
    let blob = await toBlob(quality)
    while (blob && blob.size > maxBytes && quality > 0.35) {
      quality -= 0.12
      blob = await toBlob(quality)
    }

    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * Uploads a receipt image to the backend and returns the validation result.
 * This replaces the old direct-to-OCR.space call — ScanScreen no longer
 * knows anything about OCR, parsing, or validation rules.
 */
export async function uploadReceipt(file: File, slug: string, userId?: string): Promise<ValidationResult> {
  const upload = await compressReceiptImage(file)

  const form = new FormData()
  form.append('file', upload)
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
