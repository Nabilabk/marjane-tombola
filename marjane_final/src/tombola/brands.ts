/*
  The whole point of the platform: one codebase, many brands, driven by three
  colors. Each brand ships a name, packshot, prize ladder and threshold.
  Everything visual downstream reads the CSS custom properties App.tsx injects
  from `colors`.

  Current deployment: MARJANE.
    --brand-primary   #0C2340  bleu marine historique Marjane
    --brand-secondary #F5A623  jaune/or du logo Marjane
    --brand-accent    #F27C38  orange chaud, touches d'énergie (badges, CTA²)
*/
export type Brand = {
  id: string
  name: string
  logoUrl?: string // optional brand logo image; falls back to monogram if absent
  showBrandName?: boolean // print the brand name as text next to the logo badge; defaults to true — turn off when the logo image already contains the wordmark
  heroImageUrl?: string // optional header banner photo; falls back to the flat brand-primary background if absent
  brandImages?: string[] // optional extra partner/brand logos, shown as a strip under the header
  productLine: string
  packshot: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  threshold: number // minimum receipt amount (MAD) to qualify
  prizes: number[] // wheel segments, in MAD credited to loyalty card
  probabilities?: number[] // odds of landing each `prizes[i]`, in % — same index/length as prizes; falls back to a uniform split when absent
}

export const BRANDS: Record<string, Brand> = {
  marjane: {
    id: 'marjane',
    name: 'Marjane',
    logoUrl: '/logo.png',
    productLine: 'Carte de fidélité',
    // PLACEHOLDER — generic stock photo, not real Marjane product/prize
    // photography. Self-hosted (was a hotlinked images.unsplash.com URL) so
    // production doesn't depend on a third-party CDN staying up forever,
    // but the actual image still needs swapping for the real thing before
    // this goes in front of customers. Replace public/packshot-placeholder.jpg.
    packshot: '/packshot-placeholder.jpg',
    colors: { primary: '#0C2340', secondary: '#F5A623', accent: '#F27C38' },
    threshold: 100,
    prizes: [20, 50, 0, 100, 30, 200, 10, 75],
    // Same odds as `platform/seed.ts`'s MARJANE_PROBABILITIES — the 200 MAD
    // segment is rare (1%), "no prize" carries most of the weight.
    probabilities: [20, 10, 34, 3, 15, 1, 12, 5],
  },
}

export const BRAND_ORDER = ['marjane'] as const
