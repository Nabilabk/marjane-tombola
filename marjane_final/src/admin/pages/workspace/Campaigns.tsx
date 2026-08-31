import { useMemo, useState, type DragEvent } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { SectionHeading, Badge, EmptyState } from '../../components/ui/Basics'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Field, Input } from '../../components/ui/Field'
import { Plus, MoreHorizontal, Megaphone, Copy, Archive, Eye, CheckCircle2, GripVertical } from 'lucide-react'
import type { Campaign } from '../../lib/types'
import { cn } from '../../lib/cn'
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown'
import { useAdminLang } from '../../lib/adminI18n'
import { useLiveTotals } from '../../lib/useLiveTotals'
import { isPastEndDate } from '../../../platform/schedule'

const COLUMNS: { id: Campaign['status']; labelKey: string }[] = [
  { id: 'draft', labelKey: 'campaigns.statusDraft' },
  { id: 'active', labelKey: 'campaigns.statusActive' },
  { id: 'finished', labelKey: 'campaigns.statusFinished' },
]

const STATUS_LABEL_KEY: Record<Campaign['status'], string> = {
  draft: 'campaigns.statusDraft',
  active: 'campaigns.statusActive',
  finished: 'campaigns.statusFinished',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// `isPastEndDate` (platform/schedule.ts) is the same check store.ts's
// `isCampaignEnded` runs server-side of the admin view. Used here to decide
// whether "Activate" can apply immediately or needs a new end date first
// (see `requestActivate` below), since re-activating without moving the
// date would just have it fall straight back into "Terminée" on the next
// resync.

function CampaignCard({
  campaign,
  siteSlug,
  liveParticipants,
  dragging,
  onDragStart,
  onDragEnd,
  onRequestActivate,
}: {
  campaign: Campaign
  siteSlug: string | undefined
  liveParticipants: number
  dragging: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onRequestActivate: (id: string) => void
}) {
  const duplicateCampaign = usePlatformStore((s) => s.duplicateCampaign)
  const archiveCampaign = usePlatformStore((s) => s.archiveCampaign)
  const { t } = useAdminLang()

  const statusTone =
    campaign.status === 'active' ? ('success' as const) : campaign.status === 'draft' ? ('neutral' as const) : ('warning' as const)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group cursor-grab rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[var(--pf-shadow-xs)] transition-all active:cursor-grabbing',
        dragging ? 'opacity-40' : 'hover:-translate-y-0.5 hover:shadow-[var(--pf-shadow-md)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <GripVertical className="mt-1.5 h-3.5 w-3.5 shrink-0 text-[var(--pf-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
          <span className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--pf-radius-sm)]',
            campaign.status === 'active'
              ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
              : campaign.status === 'draft'
                ? 'bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)]'
                : 'bg-[var(--pf-warning-soft)] text-[var(--pf-warning)]',
          )}>
            <Megaphone className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[13.5px] font-semibold leading-snug text-[var(--pf-ink)]">{campaign.name}</div>
            <div className="mt-0.5 font-mono text-[11px] text-[var(--pf-ink-faint)] tabular">
              {fmt(campaign.startDate)} → {fmt(campaign.endDate)}
            </div>
          </div>
        </div>
        <Dropdown
          trigger={
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]" aria-label={t('campaigns.actions')}>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem
            onClick={() => {
              if (siteSlug) window.open(`/${siteSlug}`, '_blank', 'noopener,noreferrer')
            }}
          >
            <Eye className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('campaigns.preview')}
          </DropdownItem>
          <DropdownItem onClick={() => duplicateCampaign(campaign.id)}>
            <Copy className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('platform.duplicate')}
          </DropdownItem>
          {campaign.status !== 'active' && (
            <DropdownItem onClick={() => onRequestActivate(campaign.id)}>
              <CheckCircle2 className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('campaigns.activate')}
            </DropdownItem>
          )}
          <DropdownItem danger onClick={() => archiveCampaign(campaign.id)}>
            <Archive className="h-4 w-4" /> {t('campaigns.archive')}
          </DropdownItem>
        </Dropdown>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--pf-border)] pt-3">
        <div className="font-mono text-[12px] text-[var(--pf-ink-muted)] tabular">
          {liveParticipants.toLocaleString('fr-FR')} {t('sidebar.participants').toLowerCase()}
        </div>
        <Badge tone={statusTone} dot>
          {t(STATUS_LABEL_KEY[campaign.status])}
        </Badge>
      </div>
    </div>
  )
}

export default function Campaigns() {
  const { siteId } = useParams()
  const campaigns = usePlatformStore(useShallow((s) => s.campaignsFor(siteId!)))
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const liveTotals = useLiveTotals(website?.slug)
  const createCampaign = usePlatformStore((s) => s.createCampaign)
  const updateStatus = usePlatformStore((s) => s.updateCampaignStatus)
  const updateSchedule = usePlatformStore((s) => s.updateSchedule)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const { t } = useAdminLang()

  // Drag-and-drop status changes — dropping a card on a column is the same
  // "verify/change status" action as the card's "Activate" menu item, just
  // faster: drag to Active to launch it, drag to Finished to wrap it up.
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<Campaign['status'] | null>(null)

  // Reactivating a finished tombola whose end date has already passed can't
  // just flip its status — the next resync would immediately drop it back
  // into "Terminée" (see store.ts's `isCampaignEnded`/`campaignToAdminCampaign`).
  // So activating one asks for a new end date first instead of silently
  // failing to stick.
  const [reactivateId, setReactivateId] = useState<string | null>(null)
  const [reactivateEndDate, setReactivateEndDate] = useState('')
  const [reactivateEndTime, setReactivateEndTime] = useState('')

  function requestActivate(id: string) {
    const c = campaigns.find((c) => c.id === id)
    if (c && isPastEndDate(c.endDate, website?.schedule.endTime ?? '')) {
      setReactivateId(id)
      setReactivateEndDate(c.endDate)
      setReactivateEndTime(website?.schedule.endTime || '23:59')
    } else {
      updateStatus(id, 'active')
    }
  }

  const reactivateStillPast = isPastEndDate(reactivateEndDate, reactivateEndTime)

  function confirmReactivate() {
    if (!reactivateId || reactivateStillPast) return
    updateSchedule(reactivateId, { endDate: reactivateEndDate, endTime: reactivateEndTime })
    updateStatus(reactivateId, 'active')
    setReactivateId(null)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, status: Campaign['status']) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) {
      if (status === 'active') requestActivate(id)
      else updateStatus(id, status)
    }
    setDraggedId(null)
    setOverCol(null)
  }

  const grouped = useMemo(
    () => COLUMNS.map((col) => ({ ...col, items: campaigns.filter((c) => c.status === col.id) })),
    [campaigns],
  )

  return (
    <div className="pf-fade-in">
      <SectionHeading
        eyebrow={t('campaigns.eyebrow')}
        title={t('sidebar.campaigns')}
        description={t('campaigns.desc')}
        action={
          <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialogOpen(true)}>
            {t('campaigns.createCampaign')}
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t('campaigns.noneYet')}
            description={t('overviewTab.noCampaignsDesc')}
            icon={<Megaphone className="h-6 w-6" />}
            action={
              <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialogOpen(true)}>
                {t('campaigns.createCampaign')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {grouped.map((col) => (
            <div key={col.id}>
              <div className="mb-2.5 flex items-center gap-2 px-0.5">
                <span className="text-[12.5px] font-semibold text-[var(--pf-ink)]">{t(col.labelKey)}</span>
                <span className="rounded-full bg-[var(--pf-sunken)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--pf-ink-faint)] tabular">
                  {col.items.length}
                </span>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (overCol !== col.id) setOverCol(col.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null)
                }}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  'space-y-2.5 rounded-[var(--pf-radius-md)] bg-[var(--pf-sunken)]/50 p-2 transition-colors',
                  overCol === col.id && draggedId && 'bg-[var(--pf-accent-soft)] ring-2 ring-[var(--pf-accent)] ring-inset',
                )}
              >
                {col.items.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    siteSlug={website?.slug}
                    liveParticipants={liveTotals.loading ? c.participants : liveTotals.participants}
                    dragging={draggedId === c.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggedId(c.id)
                    }}
                    onDragEnd={() => {
                      setDraggedId(null)
                      setOverCol(null)
                    }}
                    onRequestActivate={requestActivate}
                  />
                ))}
                {col.items.length === 0 && (
                  <div
                    className={cn(
                      'rounded-[var(--pf-radius-sm)] border border-dashed px-3 py-6 text-center text-[12px] transition-colors',
                      overCol === col.id && draggedId
                        ? 'border-[var(--pf-accent)] text-[var(--pf-accent)]'
                        : 'border-[var(--pf-border-strong)] text-[var(--pf-ink-faint)]',
                    )}
                  >
                    {overCol === col.id && draggedId ? t('campaigns.dropToMove') : t('campaigns.nothingHere')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t('campaigns.createCampaignTitle')} description={t('campaigns.createCampaignDesc')}>
        <div className="space-y-4">
          <Field label={t('campaigns.campaignName')} required>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grande Tombola d'Hiver" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={() => {
                createCampaign(siteId!, name.trim())
                setName('')
                setDialogOpen(false)
              }}
            >
              {t('campaigns.createCampaign')}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={reactivateId !== null}
        onClose={() => setReactivateId(null)}
        title={t('campaigns.reactivateTitle')}
        description={t('campaigns.reactivateDesc')}
        width={420}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('settings.endDate')}>
              <Input type="date" autoFocus value={reactivateEndDate} onChange={(e) => setReactivateEndDate(e.target.value)} />
            </Field>
            <Field label={t('settings.endTime')}>
              <Input type="time" value={reactivateEndTime} onChange={(e) => setReactivateEndTime(e.target.value)} />
            </Field>
          </div>
          {reactivateStillPast && (
            <p className="text-[12px] text-[var(--pf-danger)]">{t('campaigns.reactivateDateError')}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setReactivateId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" disabled={reactivateStillPast} onClick={confirmReactivate}>
              {t('campaigns.reactivateConfirm')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

