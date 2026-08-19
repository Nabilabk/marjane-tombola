import { useState } from 'react'
import { Card } from '../ui/Basics'
import { ColorPicker } from '../ui/ColorPicker'
import { MediaPicker } from '../ui/MediaPicker'
import { Field, Select } from '../ui/Field'
import { Button } from '../ui/Button'
import PlayingCard from '../../../tombola/screens/components/Cards'
import Dice from '../../../tombola/screens/components/dice'
import '../../../tombola/screens/dice-theme.css'
import type {
  CardBackPattern,
  DiceStyle,
  GameGlowColor,
  CardsShadowIntensity,
  CardsTheme,
} from '../../../tombola/screens/components/cardsTheme'
import { useAdminLang } from '../../lib/adminI18n'

/*
  Admin-side editor for the Dice + Cards flow, with a live preview — the
  dice/cards-mechanic companion to ScratchCardEditor (same "branding /
  design / mechanic" shape, same two write channels for the same reason):

    - color/logo/background/shadow already belong to `campaign.theme`
      (edited everywhere else in the admin via the same `updateTheme`
      action ThemeEditor uses) — routed through `onThemeChange`.
    - card-back pattern / dice style / glow color are genuinely new,
      dice+cards-only settings, stored in `campaign.game.settings` —
      routed through `onSettingsChange`.

  `theme` is the already-merged view (see `campaignToCardsTheme` in
  `src/engine/theme.ts`) so the preview always matches what the live site
  would actually render.
*/

const BACK_PATTERNS: { value: CardBackPattern; labelKey: string }[] = [
  { value: 'ornament', labelKey: 'cardsEditor.patternOrnament' },
  { value: 'diamond', labelKey: 'cardsEditor.patternDiamond' },
  { value: 'minimal', labelKey: 'wheelEditor.minimal' },
  { value: 'logoFocus', labelKey: 'cardsEditor.patternLogoFocus' },
]

const DICE_STYLES: { value: DiceStyle; labelKey: string }[] = [
  { value: 'classic', labelKey: 'cardsEditor.diceClassic' },
  { value: 'midnight', labelKey: 'cardsEditor.diceMidnight' },
  { value: 'brandTint', labelKey: 'cardsEditor.diceBrandTint' },
]

const GLOW_COLORS: { value: GameGlowColor; labelKey: string }[] = [
  { value: 'gold', labelKey: 'cardsEditor.glowGold' },
  { value: 'brandAccent', labelKey: 'cardsEditor.glowBrandAccent' },
  { value: 'silver', labelKey: 'cardsEditor.glowSilver' },
]

const SHADOW_LEVELS: { value: CardsShadowIntensity; labelKey: string }[] = [
  { value: 'none', labelKey: 'common.none' },
  { value: 'soft', labelKey: 'themeEditor.styleSoft' },
  { value: 'medium', labelKey: 'themeEditor.sizeMedium' },
  { value: 'strong', labelKey: 'themeEditor.shadowStrong' },
]

export interface CardsThemePatch {
  primary?: string
  secondary?: string
  accent?: string
  logoUrl?: string
  backgroundImageUrl?: string
  shadowIntensity?: CardsShadowIntensity
}

export interface CardsSettingsPatch {
  cardsBackPattern?: CardBackPattern
  cardsDiceStyle?: DiceStyle
  cardsGlowColor?: GameGlowColor
}

export interface CardsEditorProps {
  theme: CardsTheme
  onThemeChange: (patch: CardsThemePatch) => void
  onSettingsChange: (patch: CardsSettingsPatch) => void
}

export default function CardsEditor({ theme, onThemeChange, onSettingsChange }: CardsEditorProps) {
  // Preview-only flip toggle — doesn't touch real campaign/draw state, just
  // lets an admin see the card-back pattern next to a winning front face.
  const [previewOpened, setPreviewOpened] = useState(false)
  const [previewRolling, setPreviewRolling] = useState(false)
  const { t } = useAdminLang()

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-5 p-5">
        <div>
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('cardsEditor.branding')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('cardsEditor.brandingDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorPicker label={t('wheelEditor.primary')} value={theme.colors.primary} onChange={(v) => onThemeChange({ primary: v })} />
            <ColorPicker label={t('wheelEditor.secondary')} value={theme.colors.secondary} onChange={(v) => onThemeChange({ secondary: v })} />
            <ColorPicker label={t('wheelEditor.accent')} value={theme.colors.accent} onChange={(v) => onThemeChange({ accent: v })} />
            <Field label={t('wheelEditor.logo')}>
              <MediaPicker value={theme.logoUrl ?? ''} onChange={(v) => onThemeChange({ logoUrl: v })} />
            </Field>
          </div>
        </div>

        <div className="border-t border-[var(--pf-border)] pt-4">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('cardsEditor.design')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('cardsEditor.designDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('wheelEditor.shadow')}>
              <Select
                value={theme.shadowIntensity}
                onChange={(e) => onThemeChange({ shadowIntensity: e.target.value as CardsShadowIntensity })}
              >
                {SHADOW_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('wheelEditor.backgroundImage')} hint={t('cardsEditor.backgroundImageHint')}>
              <MediaPicker
                value={theme.backgroundImageUrl ?? ''}
                onChange={(v) => onThemeChange({ backgroundImageUrl: v })}
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[var(--pf-border)] pt-4">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('cardsEditor.mechanic')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('cardsEditor.mechanicDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('cardsEditor.backPattern')}>
              <Select
                value={theme.cardBackPattern}
                onChange={(e) => onSettingsChange({ cardsBackPattern: e.target.value as CardBackPattern })}
              >
                {BACK_PATTERNS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('cardsEditor.diceStyle')}>
              <Select
                value={theme.diceStyle}
                onChange={(e) => onSettingsChange({ cardsDiceStyle: e.target.value as DiceStyle })}
              >
                {DICE_STYLES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {t(d.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('cardsEditor.glowColor')} hint={t('cardsEditor.glowColorHint')}>
              <Select
                value={theme.glowColor}
                onChange={(e) => onSettingsChange({ cardsGlowColor: e.target.value as GameGlowColor })}
              >
                {GLOW_COLORS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {t(g.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <div className="scratch-editor-preview-stage">
          <Dice value={4} rolling={previewRolling} size="sm" theme={theme} />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            setPreviewRolling(true)
            setTimeout(() => setPreviewRolling(false), 1200)
          }}
          disabled={previewRolling}
        >
          {previewRolling ? t('cardsEditor.rolling') : t('cardsEditor.previewRoll')}
        </Button>

        <div className="scratch-editor-preview-stage flex items-center justify-center gap-3">
          <PlayingCard
            value={50}
            opened={previewOpened}
            canPick
            logoUrl={theme.logoUrl}
            onClick={() => setPreviewOpened((v) => !v)}
            theme={theme}
          />
          <PlayingCard
            value={0}
            opened={previewOpened}
            canPick
            logoUrl={theme.logoUrl}
            onClick={() => setPreviewOpened((v) => !v)}
            theme={theme}
          />
        </div>
        <p className="text-center text-[11.5px] text-[var(--pf-ink-faint)]">
          {t('cardsEditor.previewHint')}
        </p>
      </div>
    </div>
  )
}
