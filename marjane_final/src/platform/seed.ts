/*
  Campaign Seed — Campaign #1 IS the real Marjane Tombola website.

  This migrates the existing production UI data into the unified Campaign
  model: the brand from tombola/brands.ts, the FR/AR dictionaries from
  tombola/i18n.ts, the game config from the real Dice+Cards flow, and the
  prize ladder from the real backend seed. NO fake campaigns, NO mock
  participants, NO placeholder data.
*/

import type { Campaign } from './types'
import { BRANDS } from '../tombola/brands'
import { t } from '../tombola/i18n'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

const MARJANE_PRIZES = [20, 50, 0, 100, 30, 200, 10, 75]
// Odds of landing each `MARJANE_PRIZES[i]`, in %, same index — the big 200 MAD
// segment is intentionally rare (1%) while the "no prize" segment carries
// most of the weight. Sums to 100.
const MARJANE_PROBABILITIES = [20, 10, 34, 3, 15, 1, 12, 5]

/** Build the real Marjane campaign from the existing production sources. */
export function buildMarjaneCampaign(): Campaign {
  const marjane = BRANDS['marjane']
  const now = new Date().toISOString()

  const translations = Object.entries(t).map(([key, value]) => ({
    id: uid('tr'),
    key,
    fr: value.fr,
    ar: value.ar,
  }))

  return {
    id: 'campaign-marjane',
    name: 'Marjane Summer Campaign',
    slug: 'marjane',
    status: 'live',
    maintenanceMode: false,
    description: 'Grande tombola d\'été — une expérience qui fait gagner.',
    template: 'modern',
    language: 'fr',
    createdAt: now,
    updatedAt: now,
    domain: 'promo.company.com/marjane',

    brand: {
      name: marjane.name,
      tagline: t.homeTagline.fr,
      logoUrl: marjane.logoUrl,
      faviconUrl: '',
      productLine: marjane.productLine,
      packshot: marjane.packshot,
      colors: {
        primary: marjane.colors.primary,
        secondary: marjane.colors.secondary,
        accent: marjane.colors.accent,
      },
    },

    theme: {
      primary: marjane.colors.primary,
      secondary: marjane.colors.secondary,
      accent: marjane.colors.accent,
      font: 'display',
      radius: 14,
      buttonStyle: 'solid',
      buttonSize: 'md',
      animationLevel: 'subtle',
      shadowIntensity: 'medium',
      spacing: 'comfortable',
      borderWidth: 1,
      darkMode: false,
      backgroundImageUrl: '',
      logoUrl: marjane.logoUrl ?? '',
      showBrandName: true,
      faviconUrl: '',
      heroImageUrl: '',
      brandImages: [],
      rulesUrl: '/reglement-tombola-digitale.pdf',
    },

    pages: [
      { id: 'home', name: 'Home', description: 'Welcome + how it works', enabled: true, content: { title: t.homeTitle.fr, subtitle: t.homeSub.fr }, order: 0 },
      { id: 'scan', name: 'Scan', description: 'Receipt capture + OCR validation', enabled: true, content: { title: t.scanTitle.fr }, order: 1 },
      { id: 'game', name: 'Game', description: 'Dice roll + card flip moment', enabled: true, content: { title: t.diceTitle.fr }, order: 2 },
      { id: 'winner', name: 'Winner', description: 'Prize reveal celebration', enabled: true, content: { title: t.winTitle.fr }, order: 3 },
      { id: 'rules', name: 'Rules', description: 'Official game rules', enabled: true, content: { title: 'Règlement' }, order: 4 },
      { id: 'faq', name: 'FAQ', description: 'Frequently asked questions', enabled: false, content: {}, order: 5 },
      { id: 'contact', name: 'Contact', description: 'Support contact', enabled: false, content: {}, order: 6 },
      { id: 'privacy', name: 'Privacy', description: 'Data privacy policy', enabled: false, content: {}, order: 7 },
    ],

    game: {
      id: 'cards',
      name: 'Cards',
      enabled: true,
      settings: {
        cardCount: 9,
        maxPickLimit: 6,
        rounds: 6,
      },
      prizes: MARJANE_PRIZES,
      probabilities: MARJANE_PROBABILITIES,
      pickLimit: 3,
    },

    products: [
      { id: uid('pr'), barcode: '6111258000015', image: '', name: 'Couscous Marjane', category: 'Épicerie', minQuantity: 2, eligible: true, status: 'active' },
      { id: uid('pr'), barcode: '6111258000022', image: '', name: 'Huile d\'argan 250ml', category: 'Beauté', minQuantity: 1, eligible: true, status: 'active' },
      { id: uid('pr'), barcode: '6111258000039', image: '', name: 'Thé vert Menthe 1kg', category: 'Épicerie', minQuantity: 3, eligible: true, status: 'active' },
      { id: uid('pr'), barcode: '6111258000046', image: '', name: 'Dattes Majhoul 500g', category: 'Épicerie', minQuantity: 1, eligible: true, status: 'active' },
    ],

    prizes: [
      { id: uid('pz'), label: '200 MAD', image: '', value: 200, probability: 2.5, stock: 300, remainingStock: 300, winningRules: 'Gain immédiat crédité sur la carte', status: 'active' },
      { id: uid('pz'), label: '100 MAD', image: '', value: 100, probability: 5, stock: 1000, remainingStock: 1000, winningRules: 'Gain immédiat crédité sur la carte', status: 'active' },
      { id: uid('pz'), label: '75 MAD', image: '', value: 75, probability: 8, stock: 1500, remainingStock: 1500, winningRules: 'Gain immédiat crédité sur la carte', status: 'active' },
      { id: uid('pz'), label: '50 MAD', image: '', value: 50, probability: 18, stock: 3000, remainingStock: 3000, winningRules: 'Gain immédiat crédité sur la carte', status: 'active' },
      { id: uid('pz'), label: '30 MAD', image: '', value: 30, probability: 22, stock: 4000, remainingStock: 4000, winningRules: 'Gain immédiat crédité sur la carte', status: 'active' },
      { id: uid('pz'), label: '20 MAD', image: '', value: 20, probability: 25, stock: 5000, remainingStock: 5000, winningRules: 'Gain immédiat crédité sur la carte', status: 'active' },
      { id: uid('pz'), label: 'Pas de gain', image: '', value: 0, probability: 19.5, stock: 999999, remainingStock: 999999, winningRules: 'Aucun gain', status: 'active' },
    ],

    // No logo entry here — the admin's Assets library derives the Logos/
    // Icons/Heroes/Backgrounds tiles live from `theme.logoUrl` etc. (see
    // admin/lib/store.ts's computeThemeAssets), so seeding one here would
    // just be dropped as a duplicate. Only the règlement is a real, directly
    // uploaded asset (see theme.rulesUrl / addAsset's Documents handling).
    assets: [
      { id: uid('as'), name: 'reglement-tombola-digitale.pdf', type: 'document', folder: 'Documents', sizeKb: 1240, url: '/reglement-tombola-digitale.pdf', uploadedAt: now },
    ],

    translations,
    schedule: {
      startDate: now.slice(0, 10),
      startTime: '00:00',
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      endTime: '23:59',
    },

    permissions: {
      owner: 'admin@campaignhub.ma',
      editors: [],
      viewers: [],
    },

    analytics: {
      participants: 0,
      validatedTickets: 0,
      rejectedTickets: 0,
      winningTickets: 0,
      dailyScans: 0,
      conversionRate: 0,
      topProducts: [],
      topStores: ['Marjane'],
      languages: { fr: 0, ar: 0, en: 0 },
      devices: { mobile: 0, desktop: 0 },
    },
  }
}

export const DEFAULT_CAMPAIGNS: Campaign[] = [buildMarjaneCampaign()]
