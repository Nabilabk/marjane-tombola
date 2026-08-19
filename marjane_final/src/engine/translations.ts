/*
  Translations Engine — converts a Campaign's editable translations into the
  `t` dict shape the existing tombola screens consume. Every screen reads
  `campaign.translations` (the admin-editable store) — never hardcoded copy.

  The i18n.ts module (static FR/AR dict) is the fallback seed; the campaign's
  editable translations override it. This keeps the real copy intact while
  letting marketing edit it from the admin.
*/

import { t as defaultDict } from '../tombola/i18n'
import type { Campaign, Lang } from '../platform/types'

export type DictKey = keyof typeof defaultDict

/** Build the dictionary a screen reads, from a campaign's translations. */
export function buildTranslations(campaign: Campaign) {
  const dict: Record<string, { fr: string; ar: string; en?: string }> = {
    ...defaultDict,
  }

  for (const tr of campaign.translations) {
    if (!tr.key) continue
    dict[tr.key] = {
      fr: tr.fr,
      ar: tr.ar,
      en: tr.en,
    }
  }

  return dict
}

/** Resolve a translation key for a given language. */
export function tr(campaign: Campaign, key: string, lang: Lang): string {
  const dict = buildTranslations(campaign)
  const entry = dict[key]
  if (!entry) return key
  if (lang === 'fr') return entry.fr
  if (lang === 'ar') return entry.ar
  return entry.en ?? entry.fr
}
