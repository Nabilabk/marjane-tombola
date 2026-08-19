import { Card } from '../ui/Basics'
import { ColorPicker } from '../ui/ColorPicker'
import { MediaPicker } from '../ui/MediaPicker'
import { Field, Select, Input } from '../ui/Field'
import ScratchCard3D from '../../../tombola/screens/components/scratch/ScratchCard3D'
import '../../../tombola/screens/dice-theme.css'
import type {
  ScratchCardTheme,
  ScratchFoilStyle,
  ScratchRevealAnimation,
  ScratchShadowIntensity,
} from '../../../tombola/screens/components/scratch/types'
import { useAdminLang } from '../../lib/adminI18n'

/*
  Admin-side editor for the Scratch Card, with a live 3D preview — the
  companion to the player-facing ScratchCard3D (same component, actually,
  just fed sample data instead of a real draw). Two write channels because
  the fields it edits live in two different places on the unified Campaign:

    - color/logo/background/radius/shadow already belong to `campaign.theme`
      (edited everywhere else in the admin via the same `updateTheme`
      action ThemeEditor uses) — routed through `onThemeChange` so this
      editor doesn't fork a second copy of that state.
    - foil style / reveal animation / product image override / reveal
      threshold are genuinely new, scratch-only settings, stored in
      `campaign.game.settings` — routed through `onSettingsChange`.

  `theme` is the already-merged view (see `campaignToScratchTheme` in
  `src/engine/theme.ts`) so the preview always matches what the live site
  would actually render.
*/

const FOIL_STYLES: { value: ScratchFoilStyle; labelKey: string }[] = [
  { value: 'brandPrimary', labelKey: 'scratchEditor.foilBrandPrimary' },
  { value: 'silver', labelKey: 'cardsEditor.glowSilver' },
  { value: 'gold', labelKey: 'cardsEditor.glowGold' },
  { value: 'brushedDark', labelKey: 'scratchEditor.foilBrushedDark' },
]

const REVEAL_ANIMATIONS: { value: ScratchRevealAnimation; labelKey: string }[] = [
  { value: 'shine', labelKey: 'scratchEditor.revealShine' },
  { value: 'confettiBurst', labelKey: 'scratchEditor.revealConfetti' },
  { value: 'simple', labelKey: 'scratchEditor.revealSimple' },
]

const SHADOW_LEVELS: { value: ScratchShadowIntensity; labelKey: string }[] = [
  { value: 'none', labelKey: 'common.none' },
  { value: 'soft', labelKey: 'themeEditor.styleSoft' },
  { value: 'medium', labelKey: 'themeEditor.sizeMedium' },
  { value: 'strong', labelKey: 'themeEditor.shadowStrong' },
]

const PREVIEW_COPY = {
  scratchLabel: 'GRATTEZ ICI',
  winLabel: 'Vous avez gagné',
  loseLabel: 'Pas de chance, retentez demain',
  currencyLabel: 'DH',
}

export interface ScratchThemePatch {
  primary?: string
  secondary?: string
  accent?: string
  logoUrl?: string
  backgroundImageUrl?: string
  radius?: number
  shadowIntensity?: ScratchShadowIntensity
}

export interface ScratchSettingsPatch {
  scratchFoilStyle?: ScratchFoilStyle
  scratchRevealAnimation?: ScratchRevealAnimation
  scratchProductImageUrl?: string
  scratchRevealThreshold?: number
}

export interface ScratchCardEditorProps {
  theme: ScratchCardTheme
  onThemeChange: (patch: ScratchThemePatch) => void
  onSettingsChange: (patch: ScratchSettingsPatch) => void
}

export default function ScratchCardEditor({ theme, onThemeChange, onSettingsChange }: ScratchCardEditorProps) {
  const { t } = useAdminLang()
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-5 p-5">
        <div>
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('cardsEditor.branding')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('scratchEditor.brandingDesc')}
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
            {t('scratchEditor.designDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('themeEditor.cornerRadius')} hint={t('scratchEditor.cornerRadiusHint')}>
              <Input
                type="number"
                min={0}
                max={48}
                value={theme.radius}
                onChange={(e) => onThemeChange({ radius: Number(e.target.value) })}
                className="font-mono"
              />
            </Field>
            <Field label={t('wheelEditor.shadow')}>
              <Select
                value={theme.shadowIntensity}
                onChange={(e) => onThemeChange({ shadowIntensity: e.target.value as ScratchShadowIntensity })}
              >
                {SHADOW_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('wheelEditor.backgroundImage')} hint={t('scratchEditor.backgroundImageHint')}>
              <MediaPicker
                value={theme.backgroundImageUrl ?? ''}
                onChange={(v) => onThemeChange({ backgroundImageUrl: v })}
              />
            </Field>
            <Field label={t('scratchEditor.productImage')} hint={t('scratchEditor.productImageHint')}>
              <MediaPicker
                value={theme.productImageUrl ?? ''}
                onChange={(v) => onSettingsChange({ scratchProductImageUrl: v })}
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[var(--pf-border)] pt-4">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('scratchEditor.mechanic')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('scratchEditor.mechanicDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('scratchEditor.foilStyle')}>
              <Select
                value={theme.foilStyle}
                onChange={(e) => onSettingsChange({ scratchFoilStyle: e.target.value as ScratchFoilStyle })}
              >
                {FOIL_STYLES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {t(f.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('scratchEditor.revealAnimation')}>
              <Select
                value={theme.revealAnimation}
                onChange={(e) =>
                  onSettingsChange({ scratchRevealAnimation: e.target.value as ScratchRevealAnimation })
                }
              >
                {REVEAL_ANIMATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {t(a.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('scratchEditor.autoRevealThreshold')} hint={t('scratchEditor.autoRevealThresholdHint')}>
              <Input
                type="number"
                min={40}
                max={95}
                value={theme.revealThreshold}
                onChange={(e) => onSettingsChange({ scratchRevealThreshold: Number(e.target.value) })}
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      </Card>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="scratch-editor-preview-stage">
          <ScratchCard3D
            key={`${theme.foilStyle}-${theme.revealAnimation}`}
            theme={theme}
            prize={{ amount: 50 }}
            copy={PREVIEW_COPY}
            onRevealed={() => {}}
          />
        </div>
        <p className="mt-3 text-center text-[11.5px] text-[var(--pf-ink-faint)]">
          {t('scratchEditor.previewHint')}
        </p>
      </div>
    </div>
  )
}
