/*
  Prize-odds helpers — shared by the platform store, the seed data, the
  admin Prizes page, and the public engine's weighted draw. Kept in one
  place so "what happens when probabilities are missing/malformed" has a
  single definition instead of N slightly-different fallbacks.
*/

/** An even split across `n` slots, summing to exactly 100 (any remainder
    from the division lands on the last slot so the total never drifts). */
export function uniformProbabilities(n: number): number[] {
  if (n <= 0) return []
  const share = Math.floor((100 / n) * 100) / 100 // 2dp, rounded down
  const probs = Array(n).fill(share)
  const drift = 100 - share * n
  probs[n - 1] = Math.round((probs[n - 1] + drift) * 100) / 100
  return probs
}

/** Pairs `prizes` with `probabilities` for the actual draw. Falls back to a
    uniform split whenever the odds are missing or don't match the prize
    count — e.g. a campaign saved before this feature existed, or a segment
    added/removed without the caller keeping both arrays in sync. */
export function resolveProbabilities(prizes: number[], probabilities: number[] | undefined): number[] {
  if (probabilities && probabilities.length === prizes.length && probabilities.some((p) => p > 0)) {
    return probabilities
  }
  return uniformProbabilities(prizes.length)
}

/** Weighted random index pick — treats `weights` as relative, so they don't
    need to sum to 100 (a table that sums to 90 or 110 still works exactly
    like one that sums to 100). Negative/zero-total input falls back to a
    uniform pick across all weights so a draw never throws. */
export function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) return Math.floor(Math.random() * weights.length)
  let roll = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    roll -= Math.max(0, weights[i])
    if (roll < 0) return i
  }
  return weights.length - 1
}

/** Sum rounded to 2dp — what the admin UI compares against 100 to show the
    "adds up to 100%" indicator. */
export function totalProbability(probabilities: number[]): number {
  return Math.round(probabilities.reduce((sum, p) => sum + p, 0) * 100) / 100
}
