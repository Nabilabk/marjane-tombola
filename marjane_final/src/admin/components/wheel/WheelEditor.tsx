import { useState } from 'react'
import { Card } from '../ui/Basics'
import { ColorPicker } from '../ui/ColorPicker'
import { MediaPicker } from '../ui/MediaPicker'
import { Field, Select } from '../ui/Field'
import { Button } from '../ui/Button'
import Wheel from '../../../tombola/screens/components/Wheel'
import '../../../tombola/screens/dice-theme.css'
import type { WheelRimStyle, WheelPointerStyle, WheelSpinStyle, WheelShadowIntensity, WheelTheme } from '../../../tombola/screens/components/wheelTheme'
import { useAdminLang } from '../../lib/adminI18n'

/*
  Admin-side editor for the Wheel, with a live preview — the wheel-mechanic
  companion to ScratchCardEditor (same "branding / design / mechanic" shape,
  same two write channels for the same reason):

    - color/logo/background/shadow already belong to `campaign.theme`
      (edited everywhere else in the admin via the same `updateTheme`
      action ThemeEditor uses) — routed through `onThemeChange`.
    - rim style / pointer style / spin style are genuinely new, wheel-only
      settings, stored in `campaign.game.settings` — routed through
      `onSettingsChange`.

  `theme` is the already-merged view (see `campaignToWheelTheme` in
  `src/engine/theme.ts`) so the preview always matches what the live site
  would actually render.
*/

const RIM_STYLES: { value: WheelRimStyle; labelKey: string }[] = [
  { value: 'classic', labelKey: 'wheelEditor.rimClassic' },
  { value: 'minimal', labelKey: 'wheelEditor.minimal' },
  { value: 'neon', labelKey: 'wheelEditor.rimNeon' },
]

const POINTER_STYLES: { value: WheelPointerStyle; labelKey: string }[] = [
  { value: 'classic', labelKey: 'wheelEditor.pointerClassic' },
  { value: 'arrow', labelKey: 'wheelEditor.pointerArrow' },
  { value: 'ribbon', labelKey: 'wheelEditor.pointerRibbon' },
]

const SPIN_STYLES: { value: WheelSpinStyle; labelKey: string }[] = [
  { value: 'smooth', labelKey: 'wheelEditor.spinSmooth' },
  { value: 'bouncy', labelKey: 'wheelEditor.spinBouncy' },
  { value: 'mechanical', labelKey: 'wheelEditor.spinMechanical' },
]

const SHADOW_LEVELS: { value: WheelShadowIntensity; labelKey: string }[] = [
  { value: 'none', labelKey: 'common.none' },
  { value: 'soft', labelKey: 'themeEditor.styleSoft' },
  { value: 'medium', labelKey: 'themeEditor.sizeMedium' },
  { value: 'strong', labelKey: 'themeEditor.shadowStrong' },
]

const PREVIEW_PRIZES = [20, 0, 50, 10, 100, 0, 30, 200]

export interface WheelThemePatch {
  primary?: string
  secondary?: string
  accent?: string
  logoUrl?: string
  backgroundImageUrl?: string
  shadowIntensity?: WheelShadowIntensity
}

export interface WheelSettingsPatch {
  wheelRimStyle?: WheelRimStyle
  wheelPointerStyle?: WheelPointerStyle
  wheelSpinStyle?: WheelSpinStyle
}

export interface WheelEditorProps {
  theme: WheelTheme
  onThemeChange: (patch: WheelThemePatch) => void
  onSettingsChange: (patch: WheelSettingsPatch) => void
}

export default function WheelEditor({ theme, onThemeChange, onSettingsChange }: WheelEditorProps) {
  // Preview-only spin trigger — doesn't touch the real campaign state, just
  // lets an admin see the chosen spin style in motion without leaving the page.
  const [previewSpinning, setPreviewSpinning] = useState(false)
  const [previewRotation, setPreviewRotation] = useState(0)
  const { t } = useAdminLang()

  function previewSpin() {
    if (previewSpinning) return
    setPreviewSpinning(true)
    setPreviewRotation((r) => r + 5 * 360 + Math.random() * 360)
    setTimeout(() => setPreviewSpinning(false), 4200)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="space-y-5 p-5">
        <div>
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('wheelEditor.branding')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('wheelEditor.brandingDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorPicker label={t('wheelEditor.primary')} value={theme.colors.primary} onChange={(v) => onThemeChange({ primary: v })} />
            <ColorPicker label={t('wheelEditor.secondary')} value={theme.colors.secondary} onChange={(v) => onThemeChange({ secondary: v })} />
            <ColorPicker label={t('wheelEditor.accent')} value={theme.colors.accent} onChange={(v) => onThemeChange({ accent: v })} />
            <Field label={t('wheelEditor.logo')} hint={t('wheelEditor.logoHint')}>
              <MediaPicker value={theme.logoUrl ?? ''} onChange={(v) => onThemeChange({ logoUrl: v })} />
            </Field>
          </div>
        </div>

        <div className="border-t border-[var(--pf-border)] pt-4">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('wheelEditor.design')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('wheelEditor.designDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('wheelEditor.shadow')}>
              <Select
                value={theme.shadowIntensity}
                onChange={(e) => onThemeChange({ shadowIntensity: e.target.value as WheelShadowIntensity })}
              >
                {SHADOW_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('wheelEditor.backgroundImage')} hint={t('wheelEditor.backgroundImageHint')}>
              <MediaPicker
                value={theme.backgroundImageUrl ?? ''}
                onChange={(v) => onThemeChange({ backgroundImageUrl: v })}
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-[var(--pf-border)] pt-4">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('wheelEditor.mechanic')}</div>
          <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('wheelEditor.mechanicDesc')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('wheelEditor.rimStyle')}>
              <Select
                value={theme.rimStyle}
                onChange={(e) => onSettingsChange({ wheelRimStyle: e.target.value as WheelRimStyle })}
              >
                {RIM_STYLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('wheelEditor.pointerStyle')}>
              <Select
                value={theme.pointerStyle}
                onChange={(e) => onSettingsChange({ wheelPointerStyle: e.target.value as WheelPointerStyle })}
              >
                {POINTER_STYLES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('wheelEditor.spinStyle')}>
              <Select
                value={theme.spinStyle}
                onChange={(e) => onSettingsChange({ wheelSpinStyle: e.target.value as WheelSpinStyle })}
              >
                {SPIN_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="scratch-editor-preview-stage">
          <Wheel prizes={PREVIEW_PRIZES} rotation={previewRotation} spinning={previewSpinning} size="md" theme={theme} />
        </div>
        <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={previewSpin} disabled={previewSpinning}>
          {previewSpinning ? t('wheelEditor.spinning') : t('wheelEditor.previewSpin')}
        </Button>
        <p className="mt-2 text-center text-[11.5px] text-[var(--pf-ink-faint)]">
          {t('wheelEditor.previewHint')}
        </p>
      </div>
    </div>
  )
}
