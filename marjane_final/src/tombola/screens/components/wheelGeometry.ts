export interface WedgeAngle {
  start: number
  end: number
  mid: number
  size: number
}

/**
 * Wedge angles (degrees, 0 = top, clockwise) for `n` prizes — always equal
 * slices, regardless of each prize's real odds. Sizing wedges by
 * probability used to give the odds away visually (a 1%-chance prize got a
 * sliver a player could see and avoid feeling good about), which made a
 * technically-fair draw feel rigged. The actual weighted pick still happens
 * in `WheelScreen.tsx` via `pickWeightedIndex` — only how big the slice
 * *looks* is decoupled from that now.
 *
 * Shared by `Wheel.tsx` (rendering the SVG wedges) and `WheelScreen.tsx`
 * (picking the spin's target rotation) so the pointer always lands inside
 * the wedge for whichever index was actually drawn.
 */
export function computeWedgeAngles(n: number): WedgeAngle[] {
  const size = 360 / Math.max(n, 1)
  return Array.from({ length: n }, (_, i) => {
    const start = i * size
    return { start, end: start + size, mid: start + size / 2, size }
  })
}
