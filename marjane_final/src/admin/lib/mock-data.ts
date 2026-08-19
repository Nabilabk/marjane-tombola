/** Chart helpers for the analytics + dashboard pages. */

const now = Date.now()

export function dailyParticipation(seed: number = 0) {
  return Array.from({ length: 14 }).map((_, i) => {
    const jitter = Math.abs(Math.sin(seed * 13.37 + i * 7.3) * 30) | 0
    return {
      day: new Date(now - (13 - i) * 86400000).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      }),
      participants: (Math.sin(i * 1.7) * 8 + 18 + jitter / 4) | 0,
      tickets: (Math.cos(i * 1.3) * 10 + 30 + jitter / 3) | 0,
    }
  })
}

export function prizeDistribution(prizes: number[]) {
  if (!prizes.length) return []
  const palette = ['#17181C', '#2D6BE7', '#9B9EA7', '#0E9F6E', '#B45309', '#DC2626']
  return prizes.map((p, i) => ({
    name: p === 0 ? 'No prize' : `${p} MAD`,
    value: Math.max(1, 10 - i),
    color: palette[i % palette.length],
  }))
}

export function cityBreakdown() {
  return [
    { city: 'Casablanca', participants: 128 },
    { city: 'Rabat', participants: 94 },
    { city: 'Marrakech', participants: 67 },
    { city: 'Fès', participants: 41 },
    { city: 'Tanger', participants: 36 },
    { city: 'Agadir', participants: 28 },
  ]
}

export function hourlyActivity() {
  return Array.from({ length: 24 }).map((_, h) => ({
    hour: `${String(h).padStart(2, '0')}h`,
    scans: Math.max(0, Math.round(Math.abs(Math.sin((h - 9) * 0.6)) * 22) + (h > 17 && h < 21 ? 12 : 4)),
  }))
}

