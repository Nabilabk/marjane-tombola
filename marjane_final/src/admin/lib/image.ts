/**
 * Shared client-side image helpers — used by every place in the admin that
 * lets someone upload a logo/favicon/hero image (MediaPicker, the website
 * creation wizard). Centralized so there's one resize/encode policy, not
 * one per call site that could silently drift out of sync.
 */

export const MAX_FILE_SIZE_MB = 5
export const MAX_DIMENSION = 640 // longest edge, px — keeps the data URL small enough for localStorage

/** A real uploaded/pasted image (data: URL or http(s) URL) vs. a demo placeholder label/hex color. */
export function isRenderableImage(value: string) {
  return value.startsWith('data:image') || value.startsWith('http://') || value.startsWith('https://')
}

/** Downscale + re-encode an image file client-side so it doesn't bloat localStorage. */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const rawDataUrl = reader.result as string
      const img = new Image()
      img.onerror = () => reject(new Error('That file doesn’t look like a valid image.'))
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(rawDataUrl) // fallback: no canvas support, just use the original
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        // Keep transparency for png/svg/gif sources; re-encode photos as jpeg to stay compact.
        const keepAlpha = /^image\/(png|svg\+xml|gif)$/.test(file.type)
        resolve(keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  })
}

/** Validates a picked file before attempting to read it. Returns an error message, or null if OK. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.'
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `That image is too large — please pick one under ${MAX_FILE_SIZE_MB} MB.`
  }
  return null
}
