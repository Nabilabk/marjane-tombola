import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePlatformStore } from '../../../lib/store'
import { usePlatformStore as useCampaignStore } from '../../../../platform/store'
import { Badge } from '../../../components/ui/Basics'
import { DevicePreview, DeviceSwitcher, type DeviceKind } from '../../../components/DevicePreview'
import CampaignEngine, { FLOWS, normalizeGameId, type Screen } from '../../../../engine/CampaignEngine'
import { Home, ScanLine, Dices, LayoutGrid, Trophy, ArrowUpRight, Type, Disc3, Layers } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useAdminLang } from '../../../lib/adminI18n'

interface ScreenDef {
  id: Screen
  nameKey: string
  descKey: string
  icon: typeof Home
}

// Every screen the engine can render, described once. Which of these show
// up — and in what order — depends on the campaign's selected game type
// (see FLOWS in engine/CampaignEngine.tsx, the single source of truth both
// the live site and this preview read from).
const SCREEN_DEFS: Record<Screen, ScreenDef> = {
  form: { id: 'form', nameKey: 'screens.form', descKey: 'screens.formDesc', icon: Home },
  scan: { id: 'scan', nameKey: 'screens.scan', descKey: 'screens.scanDesc', icon: ScanLine },
  dice: { id: 'dice', nameKey: 'screens.dice', descKey: 'screens.diceDesc', icon: Dices },
  cards: { id: 'cards', nameKey: 'screens.cards', descKey: 'screens.cardsDesc', icon: LayoutGrid },
  scratch: { id: 'scratch', nameKey: 'screens.scratch', descKey: 'screens.scratchDesc', icon: Layers },
  wheel: { id: 'wheel', nameKey: 'screens.wheel', descKey: 'screens.wheelDesc', icon: Disc3 },
  result: { id: 'result', nameKey: 'screens.result', descKey: 'screens.resultDesc', icon: Trophy },
}

export default function ScreensTab({ onOpenTab }: { onOpenTab: (tab: string) => void }) {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const campaign = useCampaignStore((s) => s.campaigns.find((c) => c.id === siteId))
  const [screen, setScreen] = useState<Screen>('form')
  const [device, setDevice] = useState<DeviceKind>('phone')
  const { t } = useAdminLang()

  if (!website || !campaign) {
    return (
      <div className="flex h-64 items-center justify-center text-[13.5px] text-[var(--pf-ink-muted)]">
        {t('common.websiteNotFound')}
      </div>
    )
  }

  // Which screens exist — and in what order — depends on the campaign's
  // game type (set in the Prizes tab). Falls back to the current `screen`
  // selection possibly no longer existing (e.g. it was "dice" and the admin
  // just switched to Wheel) by defaulting back to the flow's first screen.
  const SCREENS = (FLOWS[normalizeGameId(campaign.game.id)] ?? FLOWS.cards).map((id) => SCREEN_DEFS[id])
  const activeScreen = SCREENS.find((s) => s.id === screen) ?? SCREENS[0]

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Screen rail — fixed order, matches the real flow */}
      <aside className="shrink-0 lg:w-[240px]">
        <div className="space-y-1.5">
          {SCREENS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScreen(s.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--pf-radius-md)] border p-3 text-left transition-all duration-150',
                screen === s.id
                  ? 'border-[var(--pf-accent)] bg-[var(--pf-accent-soft)] shadow-[0_0_0_3px_var(--pf-accent-soft)]'
                  : 'border-[var(--pf-border)] bg-[var(--pf-surface)] hover:-translate-y-0.5 hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-sm)]',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--pf-radius-sm)] font-mono text-[11px] font-semibold transition-colors',
                  screen === s.id
                    ? 'bg-[var(--pf-accent)] text-white shadow-[var(--pf-shadow-sm)]'
                    : 'bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)]',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--pf-ink)]">
                  <s.icon className="h-3.5 w-3.5 text-[var(--pf-ink-faint)]" /> {t(s.nameKey)}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-[var(--pf-ink-muted)]">{t(s.descKey)}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-[var(--pf-ink-faint)]">
          {t('builder.screensAlwaysOrder')}
        </p>
      </aside>

      {/* Live preview — the REAL site via CampaignEngine, jumped to the selected screen */}
      <div
        className="flex flex-1 flex-col items-center overflow-y-auto bg-[var(--pf-sunken)] px-6 py-7"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--pf-border-strong) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="mb-5">
          <DeviceSwitcher device={device} onChange={setDevice} />
        </div>

        <DevicePreview device={device} label={`${website.name} — ${t(activeScreen.nameKey)}`}>
          <CampaignEngine campaign={campaign} screen={activeScreen.id} />
        </DevicePreview>
      </div>

      {/* Screen info + pointer to where editing now lives */}
      <aside className="w-full shrink-0 space-y-4 overflow-y-auto border-t border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 pt-5 lg:w-[300px] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--pf-ink-faint)]">
            {t(activeScreen.nameKey)}
          </div>
          <Badge tone="accent">{t('common.live')}</Badge>
        </div>
        <p className="text-[12.5px] leading-relaxed text-[var(--pf-ink-muted)]">{t(activeScreen.descKey)}</p>

        <div className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--pf-ink)]">
            <Type className="h-3.5 w-3.5 text-[var(--pf-ink-faint)]" /> {t('builder.editCopy')}
          </div>
          <p className="text-[11.5px] leading-relaxed text-[var(--pf-ink-faint)]">
            {t('builder.editCopyDesc')}
          </p>
          <Link
            to={`/admin/site/${siteId}/theme`}
            className="mt-2 flex items-center gap-1 text-[12px] font-medium text-[var(--pf-accent)] hover:underline"
          >
            {t('builder.openThemeEditor')} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => onOpenTab('languages')}
          className="flex items-center gap-1 text-[12px] font-medium text-[var(--pf-accent)] hover:underline"
        >
          {t('builder.editTranslations')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </aside>
    </div>
  )
}
