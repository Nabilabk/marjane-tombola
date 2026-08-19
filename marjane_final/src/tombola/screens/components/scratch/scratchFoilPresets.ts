import type { ScratchCardColors, ScratchFoilStyle } from './types'

/*
  Paints the scratchable metallic foil onto a 2D canvas — read by
  ScratchFoilLayer once per size change, then progressively erased by the
  player via `destination-out`. Kept as plain canvas 2D (not a THREE
  texture, see ScratchFoilLayer's own doc comment for why) so it can be
  reused unchanged by the WebGL-failure fallback path too.
*/

const FOIL_FONT = '"Manrope", ui-sans-serif, system-ui, sans-serif'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const num = parseInt(full, 16) || 0
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

/** Multiplies a hex color's channels by `factor` (>1 lightens, <1 darkens). */
function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `rgb(${clamp(r * factor)}, ${clamp(g * factor)}, ${clamp(b * factor)})`
}

/** The base gradient stops for each foil style — a light/dark/light sweep
 *  reads as brushed metal regardless of the exact hue. */
function baseStops(style: ScratchFoilStyle, colors: ScratchCardColors): [string, string, string] {
  switch (style) {
    case 'silver':
      return ['#f1f2f5', '#aeb1ba', '#e4e5ea']
    case 'gold':
      return ['#f7e7b8', '#c79a2e', '#f2dd9e']
    case 'brushedDark':
      return ['#3a3c43', '#57595f', '#2c2d32']
    case 'brandPrimary':
    default:
      return [shade(colors.primary, 1.35), shade(colors.primary, 0.75), shade(colors.primary, 1.15)]
  }
}

/** Text color that reads on top of the given foil style. */
function labelColor(style: ScratchFoilStyle): string {
  return style === 'silver' || style === 'gold' ? 'rgba(30,26,18,0.55)' : 'rgba(255,255,255,0.72)'
}

export function paintFoil(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: ScratchFoilStyle,
  colors: ScratchCardColors,
  label: string,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  const [c1, c2, c3] = baseStops(style, colors)
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, c1)
  grad.addColorStop(0.5, c2)
  grad.addColorStop(1, c3)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // Brushed-metal streaks — cheap texture: thin, low-opacity diagonal lines
  // at varied spacing/opacity, all in one pass.
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  const step = Math.max(3, Math.round(width / 90))
  for (let x = -height; x < width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + height, height)
    ctx.stroke()
  }
  ctx.restore()

  // Diagonal sheen band — the "this is metal, not paint" highlight.
  const sheen = ctx.createLinearGradient(0, 0, width * 0.6, height)
  sheen.addColorStop(0, 'rgba(255,255,255,0)')
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.28)')
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.28)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, width, height)

  // Label + a simple geometric "scratch here" affordance (two chevrons),
  // no emoji/iconography per the brief.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = labelColor(style)
  const fontSize = Math.max(13, Math.round(width * 0.052))
  ctx.font = `700 ${fontSize}px ${FOIL_FONT}`
  ctx.letterSpacing = `${Math.round(fontSize * 0.18)}px`
  ctx.fillText((label || '').toUpperCase(), width / 2, height / 2 + fontSize * 1.6)
  ctx.letterSpacing = '0px'

  const chevronY = height / 2
  const chevronSize = fontSize * 0.55
  ctx.lineWidth = Math.max(2, fontSize * 0.12)
  ctx.strokeStyle = labelColor(style)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const dx of [-chevronSize * 1.6, 0, chevronSize * 1.6]) {
    ctx.beginPath()
    ctx.moveTo(width / 2 + dx - chevronSize / 2, chevronY - chevronSize / 2)
    ctx.lineTo(width / 2 + dx, chevronY)
    ctx.lineTo(width / 2 + dx - chevronSize / 2, chevronY + chevronSize / 2)
    ctx.stroke()
  }
}
