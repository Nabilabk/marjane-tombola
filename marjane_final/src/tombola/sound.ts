// Tiny sound-effect helper for the tombola game.
// Files live in /public/sounds and are preloaded once, then cloned on each
// play so overlapping triggers (e.g. rapid card picks) don't cut each other off.

const SOUND_FILES = {
  diceRoll: '/sounds/dice-roll.mp3',
  cardShuffle: '/sounds/card-shuffle.mp3',
  cardFlip: '/sounds/card-flip.wav',
  win: '/sounds/win.wav',
} as const

export type SoundName = keyof typeof SOUND_FILES

// Cache-bust once per page load so a browser that already cached an old
// version of one of these files (from an earlier edit during development)
// is forced to refetch the current bytes instead of silently reusing stale
// cached audio.
const CACHE_BUST = Date.now()

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {}

function getBase(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null // SSR guard
  if (!cache[name]) {
    const audio = new Audio(`${SOUND_FILES[name]}?v=${CACHE_BUST}`)
    audio.preload = 'auto'
    cache[name] = audio
  }
  return cache[name]!
}

/** Plays a game sound effect. Fails silently (e.g. if autoplay is blocked). */
export function playSound(name: SoundName, volume = 1) {
  const base = getBase(name)
  if (!base) return
  const node = base.cloneNode(true) as HTMLAudioElement
  node.volume = Math.max(0, Math.min(1, volume))
  node.play().catch(() => {
    /* ignore autoplay/interaction errors */
  })
}
