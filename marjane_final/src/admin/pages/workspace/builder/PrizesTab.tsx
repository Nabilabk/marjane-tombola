import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../../lib/store'
import { usePlatformStore as useCampaignStore } from '../../../../platform/store'
import { useShallow } from 'zustand/react/shallow'
import { Card, EmptyState, Badge } from '../../../components/ui/Basics'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Field'
import { IconPlus, IconTrash } from '../../../components/ui/icons'
import { Loader2 } from 'lucide-react'
import { cn } from '../../../lib/cn'
import type { GameId } from '../../../../platform/types'
import { totalProbability } from '../../../../platform/probabilities'
import { getPrizeOdds, savePrizeOdds } from '../../../services/prizesApi'
import { campaignToScratchTheme, campaignToWheelTheme, campaignToCardsTheme } from '../../../../engine/theme'
import ScratchCardEditor from '../../../components/scratch/ScratchCardEditor'
import WheelEditor from '../../../components/wheel/WheelEditor'
import CardsEditor from '../../../components/cards/CardsEditor'
import { useAdminLang } from '../../../lib/adminI18n'

const GAME_TYPES: { id: GameId; labelKey: string; descKey: string }[] = [
  { id: 'cards', labelKey: 'prizes.gameCards', descKey: 'prizes.gameCardsDesc' },
  { id: 'wheel', labelKey: 'prizes.gameWheel', descKey: 'prizes.gameWheelDesc' },
  { id: 'scratch', labelKey: 'prizes.gameScratch', descKey: 'prizes.gameScratchDesc' },
  { id: 'raffle', labelKey: 'prizes.gameRaffle', descKey: 'prizes.gameRaffleDesc' },
]

export default function PrizesTab() {
  const { siteId } = useParams()
  const campaigns = usePlatformStore(useShallow((s) => s.campaignsFor(siteId!)))
  const updatePrizeConfig = usePlatformStore((s) => s.updatePrizeConfig)
  const updateTheme = usePlatformStore((s) => s.updateTheme)
  // The admin-adapted `campaign` above only carries prize/odds fields —
  // the Scratch Card editor also needs theme/brand (colors, logo, radius),
  // so pull the full unified Campaign the same way ThemeEditor does.
  const fullCampaign = useCampaignStore((s) => s.campaigns.find((c) => c.id === siteId))
  const campaign = campaigns[0]
  const { t } = useAdminLang()

  const [syncing, setSyncing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // On first load, adopt whatever odds are already live on the backend
  // (the source of truth for Cards/Cups draws) so the admin isn't looking
  // at stale local numbers. If the backend is unreachable or the ladder
  // hasn't been synced yet (different length), keep the local values —
  // the next "Save odds" push will reconcile them.
  useEffect(() => {
    // 'raffle' has no prize ladder to sync — the draw happens offline,
    // decided by the admin later, not by prize_tiers odds.
    if (!campaign || !fullCampaign || campaign.gameId === 'raffle') {
      setSyncing(false)
      return
    }
    let cancelled = false
    getPrizeOdds(fullCampaign.slug)
      .then((odds) => {
        if (cancelled || odds.length !== campaign.prizes.length) return
        updatePrizeConfig(siteId!, { probabilities: odds.map((o) => o.probability) })
      })
      .catch(() => {
        /* backend not running locally — keep local odds, Save will retry */
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  if (!campaign) {
    return (
      <EmptyState
        title={t('prizes.noCampaign')}
        description={t('prizes.noCampaignDesc')}
      />
    )
  }

  // Every value/threshold/game-type change writes straight through to the
  // campaign — same live-save pattern as Theme Editor's color/slider
  // controls. Probability changes also write through locally (so the Wheel
  // game's client-side draw and this page's total stay live), but only
  // reach the backend's real draw (Cards/Cups via /api/play) when "Save
  // odds" is pressed explicitly — that's a network call, not a keystroke.
  const prizes = campaign.prizes
  const probabilities = campaign.probabilities
  const gameId = campaign.gameId ?? 'cards'
  const update = (i: number, v: number) =>
    updatePrizeConfig(siteId!, { prizes: prizes.map((x, idx) => (idx === i ? v : x)) })
  const updateProbability = (i: number, v: number) =>
    updatePrizeConfig(siteId!, { probabilities: probabilities.map((x, idx) => (idx === i ? v : x)) })
  const remove = (i: number) =>
    updatePrizeConfig(siteId!, {
      prizes: prizes.filter((_, idx) => idx !== i),
      probabilities: probabilities.filter((_, idx) => idx !== i),
    })
  const add = () =>
    updatePrizeConfig(siteId!, {
      prizes: [...prizes, 10],
      probabilities: [...probabilities, 0],
    })

  const total = totalProbability(probabilities)
  const totalIsClean = Math.abs(total - 100) < 0.01

  async function handleSaveOdds() {
    if (!fullCampaign) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await savePrizeOdds(
        fullCampaign.slug,
        prizes.map((value, i) => ({ amount: value, probability: probabilities[i] })),
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('prizes.saveOddsError'))
    } finally {
      setSaving(false)
    }
  }

  const prizeListLabelKey =
    gameId === 'wheel' ? 'prizes.wheelSegments' : gameId === 'scratch' ? 'prizes.scratchPrizes' : 'prizes.cardPrizes'

  return (
    <div className="mx-auto max-w-[820px]">
      <Card className="p-5">
        <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('builder.gameType')}</div>
        <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
          {t('builder.gameTypeDesc')}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {GAME_TYPES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => updatePrizeConfig(siteId!, { id: g.id })}
              className={cn(
                'rounded-[var(--pf-radius-md)] border p-3.5 text-left transition-all duration-150',
                gameId === g.id
                  ? 'border-[var(--pf-accent)] shadow-[0_0_0_3px_var(--pf-accent-soft)]'
                  : 'border-[var(--pf-border)] hover:border-[var(--pf-border-strong)]',
              )}
            >
              <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{t(g.labelKey)}</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--pf-ink-muted)]">
                {t(g.descKey)}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {gameId === 'scratch' && fullCampaign && (
        <Card className="mt-4 p-5">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('prizes.scratchDesignTitle')}</div>
          <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('prizes.scratchDesignDesc')}
          </p>
          <ScratchCardEditor
            theme={campaignToScratchTheme(fullCampaign)}
            onThemeChange={(patch) => updateTheme(siteId!, patch)}
            onSettingsChange={(patch) => updatePrizeConfig(siteId!, { settings: patch as Record<string, string | number | boolean> })}
          />
        </Card>
      )}

      {gameId === 'wheel' && fullCampaign && (
        <Card className="mt-4 p-5">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('prizes.wheelDesignTitle')}</div>
          <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('prizes.wheelDesignDesc')}
          </p>
          <WheelEditor
            theme={campaignToWheelTheme(fullCampaign)}
            onThemeChange={(patch) => updateTheme(siteId!, patch)}
            onSettingsChange={(patch) => updatePrizeConfig(siteId!, { settings: patch as Record<string, string | number | boolean> })}
          />
        </Card>
      )}

      {gameId === 'cards' && fullCampaign && (
        <Card className="mt-4 p-5">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('prizes.cardsDesignTitle')}</div>
          <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
            {t('prizes.cardsDesignDesc')}
          </p>
          <CardsEditor
            theme={campaignToCardsTheme(fullCampaign)}
            onThemeChange={(patch) => updateTheme(siteId!, patch)}
            onSettingsChange={(patch) => updatePrizeConfig(siteId!, { settings: patch as Record<string, string | number | boolean> })}
          />
        </Card>
      )}

      {gameId === 'raffle' && (
        <Card className="mt-4 p-5">
          <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('prizes.raffleInfoTitle')}</div>
          <p className="text-[12.5px] leading-relaxed text-[var(--pf-ink-muted)]">
            {t('prizes.raffleInfoDesc')}
          </p>
        </Card>
      )}

      {gameId !== 'raffle' && (
      <Card className="mt-4 p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[13px] font-medium text-[var(--pf-ink)]">{t(prizeListLabelKey)}</div>
          {syncing && (
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--pf-ink-faint)]">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('prizes.syncingOdds')}
            </span>
          )}
        </div>
        <p className="mb-4 text-[12.5px] text-[var(--pf-ink-muted)]">
          {t('prizes.prizeListDesc')}
        </p>
        <div className="space-y-2.5">
          {prizes.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pf-sunken)] font-mono text-[11px] font-medium text-[var(--pf-ink-muted)] tabular">
                {i + 1}
              </div>
              <Input
                type="number"
                value={p}
                onChange={(e) => update(i, Number(e.target.value))}
                className="w-28 font-mono"
              />
              <span className="text-[12px] text-[var(--pf-ink-faint)]">
                MAD {p === 0 && `· ${t('prizes.noPrize')}`}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={probabilities[i] ?? 0}
                  onChange={(e) => updateProbability(i, Number(e.target.value))}
                  className="w-20 font-mono"
                />
                <span className="text-[12px] text-[var(--pf-ink-faint)]">%</span>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-sm)] text-[var(--pf-ink-faint)] hover:bg-[var(--pf-danger-soft)] hover:text-[var(--pf-danger)]"
              >
                <IconTrash />
              </button>
            </div>
          ))}
          {prizes.length === 0 && (
            <p className="text-[12.5px] text-[var(--pf-ink-muted)]">{t('prizes.noSegments')}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pf-border)] pt-4">
          <Button variant="secondary" size="sm" icon={<IconPlus />} onClick={add}>
            {t('prizes.addSegment')}
          </Button>
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="text-[var(--pf-ink-muted)]">{t('prizes.totalProbability')}</span>
            <span
              className={cn(
                'font-mono font-semibold tabular',
                totalIsClean ? 'text-[var(--pf-ink)]' : 'text-[var(--pf-danger)]',
              )}
            >
              {total}%
            </span>
            {!totalIsClean && (
              <Badge tone="warning" dot>
                {t('prizes.shouldTotal100')}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-[var(--pf-border)] pt-4">
          <Button variant="primary" size="sm" onClick={handleSaveOdds} disabled={saving}>
            {saving ? t('prizes.saving') : t('builder.saveOdds')}
          </Button>
          <p className="text-[12px] text-[var(--pf-ink-faint)]">
            {t('prizes.saveOddsHint')}
          </p>
          {saved && (
            <Badge tone="success" dot>
              {t('prizes.saved')}
            </Badge>
          )}
          {saveError && <span className="text-[12px] text-[var(--pf-danger)]">{saveError}</span>}
        </div>
      </Card>
      )}

      <Card className="mt-4 p-5">
        <div className="mb-1 text-[13px] font-medium text-[var(--pf-ink)]">{t('builder.eligibilityThreshold')}</div>
        <p className="mb-3 text-[12.5px] text-[var(--pf-ink-muted)]">
          {t('builder.eligibilityDesc')}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={campaign.threshold ?? 100}
            onChange={(e) => updatePrizeConfig(siteId!, { threshold: Number(e.target.value) })}
            className="w-32 font-mono"
          />
          <span className="text-[12px] text-[var(--pf-ink-faint)]">MAD</span>
        </div>
      </Card>
    </div>
  )
}
