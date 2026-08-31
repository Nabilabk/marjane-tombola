import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { usePlatformStore as useCampaignStore } from '../../../platform/store'
import { DevicePreview, DeviceSwitcher, type DeviceKind } from '../../components/DevicePreview'
import CampaignEngine, { FLOWS, normalizeGameId, type Screen } from '../../../engine/CampaignEngine'
import { ColorPicker } from '../../components/ui/ColorPicker'
import { MediaPicker } from '../../components/ui/MediaPicker'
import { Select, Field } from '../../components/ui/Field'
import { Toggle } from '../../components/ui/Toggle'
import { cn } from '../../lib/cn'
import { useAdminLang } from '../../lib/adminI18n'
import { getFontFamilyCss } from '../../../engine/theme'
import {
  Palette,
  Type,
  MousePointerClick,
  Layout,
  Image as ImageIcon,
  Sparkles,
  Moon,
  Monitor,
} from 'lucide-react'

type Category = 'colors' | 'typography' | 'buttons' | 'layout' | 'images' | 'animations'

const CATEGORIES: { id: Category; labelKey: string; icon: typeof Palette }[] = [
  { id: 'colors', labelKey: 'themeEditor.colors', icon: Palette },
  { id: 'typography', labelKey: 'themeEditor.typography', icon: Type },
  { id: 'buttons', labelKey: 'themeEditor.buttons', icon: MousePointerClick },
  { id: 'layout', labelKey: 'themeEditor.layout', icon: Layout },
  { id: 'images', labelKey: 'themeEditor.images', icon: ImageIcon },
  { id: 'animations', labelKey: 'themeEditor.animations', icon: Sparkles },
]

// Every screen the engine can render, labeled once. Which of these the page
// switcher actually shows — and in what order — depends on the campaign's
// selected game type (see FLOWS in engine/CampaignEngine.tsx, the single
// source of truth both the live site and this preview read from). Reuses
// the same screens.* dict keys as the Screens tab (builder/ScreensTab.tsx).
const PAGE_LABEL_KEYS: Record<Screen, string> = {
  form: 'screens.form',
  scan: 'screens.scan',
  dice: 'screens.dice',
  cards: 'screens.cards',
  scratch: 'screens.scratch',
  wheel: 'screens.wheel',
  result: 'screens.result',
}

export default function ThemeEditor() {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const updateTheme = usePlatformStore((s) => s.updateTheme)
  const updateTranslation = usePlatformStore((s) => s.updateTranslation)
  const campaign = useCampaignStore((s) => s.campaigns.find((c) => c.id === siteId))
  const [category, setCategory] = useState<Category>('colors')
  const [page, setPage] = useState<Screen>('form')
  const [device, setDevice] = useState<DeviceKind>('phone')
  const { t } = useAdminLang()

  if (!website || !campaign) {
    return (
      <div className="flex h-full items-center justify-center text-[13.5px] text-[var(--pf-ink-muted)]">
        {t('common.websiteNotFound')}
      </div>
    )
  }

  const theme = website.theme
  const set = (patch: Partial<typeof theme>) => updateTheme(website.id, patch)
  const PAGES = (FLOWS[normalizeGameId(campaign.game.id)] ?? FLOWS.cards).map((id) => ({ id, labelKey: PAGE_LABEL_KEYS[id] }))
  const activePage = PAGES.find((p) => p.id === page) ?? PAGES[0]

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Category rail */}
      <aside className="shrink-0 border-b border-[var(--pf-border)] bg-[var(--pf-surface)] p-2 lg:w-[200px] lg:border-b-0 lg:border-r lg:p-3">
        <div className="mb-2 hidden px-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--pf-ink-faint)] lg:block">
          {t('themeEditor.customize')}
        </div>
        <div className="flex gap-1 overflow-x-auto lg:flex-col lg:space-y-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                'relative flex shrink-0 items-center gap-2.5 rounded-[var(--pf-radius-sm)] px-2.5 py-2 text-left text-[13px] font-medium transition-all duration-150',
                category === c.id
                  ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
                  : 'text-[var(--pf-ink-muted)] hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]',
              )}
            >
              {category === c.id && (
                <span className="absolute inset-y-1.5 -left-2 hidden w-[3px] rounded-full bg-[var(--pf-accent)] lg:block" />
              )}
              <c.icon className="h-4 w-4" />
              {t(c.labelKey)}
            </button>
          ))}
        </div>
      </aside>

      {/* Phone preview — renders the REAL website via CampaignEngine */}
      <div
        className="flex flex-1 flex-col items-center overflow-y-auto bg-[var(--pf-sunken)] px-6 py-7"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--pf-border-strong) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white p-0.5 shadow-[var(--pf-shadow-xs)]">
            {PAGES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPage(p.id)}
                className={cn(
                  'shrink-0 rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150',
                  page === p.id ? 'bg-[var(--pf-ink)] text-white shadow-[var(--pf-shadow-sm)]' : 'text-[var(--pf-ink-muted)] hover:text-[var(--pf-ink)]',
                )}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
          <DeviceSwitcher device={device} onChange={setDevice} />
        </div>

        <DevicePreview device={device} label={`${website.name} — ${t(activePage.labelKey)}`}>
          <CampaignEngine
            campaign={campaign}
            screen={activePage.id}
            editable={category === 'typography'}
            onEditText={(key, editLang, value) => updateTranslation(website.id, key, editLang, value)}
          />
        </DevicePreview>

        {category === 'typography' ? (
          <p className="mt-3 max-w-[380px] text-center text-[11px] text-[var(--pf-ink-faint)]">
            {t('themeEditor.clickToEditHint')}
          </p>
        ) : null}

        <div className="mt-5 flex w-full max-w-[420px] items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-white px-4 py-2.5 shadow-[var(--pf-shadow-xs)]">
          <span className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--pf-ink-muted)]">
            <Monitor className="h-4 w-4" /> {t('themeEditor.livePreview')}
          </span>
          <span className="font-mono text-[11px] text-[var(--pf-ink-faint)]">
            {theme.primary} · r{theme.radius}
          </span>
        </div>
      </div>

      {/* Controls */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 lg:w-[300px] lg:border-l lg:border-t-0">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--pf-ink-faint)]">
            {t(CATEGORIES.find((c) => c.id === category)?.labelKey ?? '')}
          </div>
          <div className="flex items-center gap-1 rounded-[var(--pf-radius-xs)] border border-[var(--pf-border)] p-0.5">
            <button
              type="button"
              onClick={() => set({ darkMode: false })}
              className={cn('flex items-center gap-1 rounded-[5px] px-2 py-1 text-[11px] font-medium', !theme.darkMode ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]' : 'text-[var(--pf-ink-faint)]')}
            >
              <Monitor className="h-3 w-3" /> {t('themeEditor.light')}
            </button>
            <button
              type="button"
              onClick={() => set({ darkMode: true })}
              className={cn('flex items-center gap-1 rounded-[5px] px-2 py-1 text-[11px] font-medium', theme.darkMode ? 'bg-[var(--pf-ink)] text-white' : 'text-[var(--pf-ink-faint)]')}
            >
              <Moon className="h-3 w-3" /> {t('themeEditor.dark')}
            </button>
          </div>
        </div>

        {category === 'colors' && (
          <div className="space-y-5">
            <ColorPicker label={t('settings.primaryColor')} value={theme.primary} onChange={(v) => set({ primary: v })} />
            <ColorPicker label={t('settings.secondaryColor')} value={theme.secondary} onChange={(v) => set({ secondary: v })} />
            <ColorPicker label={t('settings.accentColor')} value={theme.accent} onChange={(v) => set({ accent: v })} />
          </div>
        )}

        {category === 'typography' && (
          <div className="space-y-5">
            <Field label={t('themeEditor.fontFamily')} hint={t('themeEditor.fontFamilyHint')}>
              <Select value={theme.font} onChange={(e) => set({ font: e.target.value as typeof theme.font })}>
                <option value="display">{t('settings.fontDisplay')}</option>
                <option value="classic">{t('settings.fontClassic')}</option>
                <option value="rounded">{t('settings.fontRounded')}</option>
                <option value="modern">{t('settings.fontModern')}</option>
                <option value="elegant">{t('settings.fontElegant')}</option>
                <option value="playful">{t('settings.fontPlayful')}</option>
              </Select>
            </Field>
            <div className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--pf-ink-faint)]">{t('themeEditor.preview')}</div>
              <div className="mt-2 text-[18px] font-bold" style={{ fontFamily: getFontFamilyCss(theme.font) }}>
                La Grande Tombola
              </div>
              <p className="mt-1 text-[12px] text-[var(--pf-ink-muted)]" style={{ fontFamily: getFontFamilyCss(theme.font) }}>
                Achetez, scannez, gagnez.
              </p>
            </div>
            <p className="text-[11.5px] leading-relaxed text-[var(--pf-ink-faint)]">
              {t('themeEditor.typographyHint')}
            </p>
            <div className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
              <Toggle
                checked={theme.showBrandName ?? true}
                onChange={(v) => set({ showBrandName: v })}
                label={t('themeEditor.showBrandName')}
                description={t('themeEditor.showBrandNameHint')}
              />
            </div>
          </div>
        )}

        {category === 'buttons' && (
          <div className="space-y-5">
            <Field label={t('themeEditor.buttonStyle')}>
              <Select value={theme.buttonStyle} onChange={(e) => set({ buttonStyle: e.target.value as typeof theme.buttonStyle })}>
                <option value="solid">{t('themeEditor.styleSolid')}</option>
                <option value="outline">{t('themeEditor.styleOutline')}</option>
                <option value="soft">{t('themeEditor.styleSoft')}</option>
              </Select>
            </Field>
            <Field label={t('themeEditor.buttonSize')}>
              <Select value={theme.buttonSize} onChange={(e) => set({ buttonSize: e.target.value as typeof theme.buttonSize })}>
                <option value="sm">{t('themeEditor.sizeSmall')}</option>
                <option value="md">{t('themeEditor.sizeMedium')}</option>
                <option value="lg">{t('themeEditor.sizeLarge')}</option>
              </Select>
            </Field>
            <Field label={t('themeEditor.cornerRadius')} hint={`${theme.radius}px`}>
              <input
                type="range"
                min={0}
                max={28}
                value={theme.radius}
                onChange={(e) => set({ radius: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              {(['solid', 'outline', 'soft'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ buttonStyle: s })}
                  className="flex-1 rounded-[var(--pf-radius-sm)] py-2.5 text-[12px] font-semibold transition-transform hover:scale-[1.03]"
                  style={{
                    background: s === 'outline' ? 'transparent' : s === 'soft' ? theme.accent + '1F' : theme.primary,
                    color: s === 'outline' ? theme.primary : s === 'soft' ? theme.primary : '#fff',
                    border: s === 'outline' ? `1.5px solid ${theme.primary}` : 'none',
                    borderRadius: theme.radius,
                  }}
                >
                  {t(s === 'solid' ? 'themeEditor.styleSolid' : s === 'outline' ? 'themeEditor.styleOutline' : 'themeEditor.styleSoft')}
                </button>
              ))}
            </div>
          </div>
        )}

        {category === 'layout' && (
          <div className="space-y-5">
            <Field label={t('themeEditor.spacing')} hint={t('themeEditor.spacingHint')}>
              <Select value={theme.spacing} onChange={(e) => set({ spacing: e.target.value as typeof theme.spacing })}>
                <option value="compact">{t('themeEditor.spacingCompact')}</option>
                <option value="comfortable">{t('themeEditor.spacingComfortable')}</option>
                <option value="spacious">{t('themeEditor.spacingSpacious')}</option>
              </Select>
            </Field>
            <Field label={t('themeEditor.shadowIntensity')}>
              <Select value={theme.shadowIntensity} onChange={(e) => set({ shadowIntensity: e.target.value as typeof theme.shadowIntensity })}>
                <option value="none">{t('themeEditor.shadowNone')}</option>
                <option value="soft">{t('themeEditor.styleSoft')}</option>
                <option value="medium">{t('themeEditor.sizeMedium')}</option>
                <option value="strong">{t('themeEditor.shadowStrong')}</option>
              </Select>
            </Field>
            <Field label={t('themeEditor.borderWidth')} hint={`${theme.borderWidth}px`}>
              <input
                type="range"
                min={0}
                max={3}
                value={theme.borderWidth}
                onChange={(e) => set({ borderWidth: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
            <Field label={t('themeEditor.baseCornerRadius')} hint={`${theme.radius}px`}>
              <input
                type="range"
                min={0}
                max={28}
                value={theme.radius}
                onChange={(e) => set({ radius: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          </div>
        )}

        {category === 'images' && (
          <div className="space-y-5">
            <MediaPicker label={t('settings.logoUrl')} value={theme.logoUrl} onChange={(v) => set({ logoUrl: v })} />
            <MediaPicker label={t('themeEditor.backgroundImage')} value={theme.backgroundImageUrl} onChange={(v) => set({ backgroundImageUrl: v })} />
            <MediaPicker label={t('themeEditor.heroImage')} value={theme.heroImageUrl} onChange={(v) => set({ heroImageUrl: v })} />
            <div>
              <MediaPicker label={t('themeEditor.favicon')} value={theme.faviconUrl} onChange={(v) => set({ faviconUrl: v })} />
              {/* Mock browser tab — the favicon never touches THIS admin
                  tab's own icon (see engine/theme.ts's applyPublicSiteChrome),
                  so without this the field looks like it does nothing. Gives
                  immediate visual confirmation of what got picked. */}
              <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-t-[8px] border border-b-0 border-[var(--pf-border-strong)] bg-white px-2.5 py-1.5 shadow-[var(--pf-shadow-xs)]">
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-[var(--pf-sunken)]">
                  {theme.faviconUrl ? (
                    <img src={theme.faviconUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-2.5 w-2.5 text-[var(--pf-ink-faint)]" />
                  )}
                </span>
                <span className="max-w-[160px] truncate text-[11px] text-[var(--pf-ink-muted)]">{website.name}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--pf-ink-faint)]">{t('themeEditor.faviconHint')}</p>
            </div>
            <div>
              <span className="mb-1.5 block text-[12.5px] font-medium text-[var(--pf-ink)]">{t('themeEditor.brandImages')}</span>
              <div className="grid grid-cols-4 gap-2">
                {theme.brandImages.map((img, i) => (
                  <MediaPicker
                    key={i}
                    compact
                    value={img}
                    onChange={(v) =>
                      set({
                        brandImages: v
                          ? theme.brandImages.map((existing, idx) => (idx === i ? v : existing))
                          : theme.brandImages.filter((_, idx) => idx !== i),
                      })
                    }
                  />
                ))}
                <MediaPicker
                  compact
                  value=""
                  onChange={(v) => {
                    if (v) set({ brandImages: [...theme.brandImages, v] })
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--pf-ink-faint)]">{t('themeEditor.brandImagesHint')}</p>
            </div>
          </div>
        )}

        {category === 'animations' && (
          <div className="space-y-5">
            <Field label={t('themeEditor.motionLevel')} hint={t('themeEditor.motionLevelHint')}>
              <Select value={theme.animationLevel} onChange={(e) => set({ animationLevel: e.target.value as typeof theme.animationLevel })}>
                <option value="none">{t('themeEditor.motionNone')}</option>
                <option value="subtle">{t('themeEditor.motionSubtle')}</option>
                <option value="lively">{t('themeEditor.motionLively')}</option>
              </Select>
            </Field>
            <div className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
              <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--pf-ink-faint)]">{t('themeEditor.preview')}</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]">✦</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--pf-sunken)]">
                  <div
                    className="h-full rounded-full bg-[var(--pf-accent)] transition-all duration-700"
                    style={{ width: theme.animationLevel === 'none' ? '30%' : '100%', animation: theme.animationLevel === 'lively' ? 'pf-shimmer 1.4s ease infinite' : undefined }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
