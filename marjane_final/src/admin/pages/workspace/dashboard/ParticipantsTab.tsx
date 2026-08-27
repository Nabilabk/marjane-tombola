import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore as useCampaignStore } from '../../../../platform/store'
import { Badge, EmptyState } from '../../../components/ui/Basics'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { DataTable } from '../../../components/ui/DataTable'
import type { Column } from '../../../components/ui/DataTable'
import { Select, Input, Field } from '../../../components/ui/Field'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Loader2, Users, AlertTriangle, Shuffle, PartyPopper } from 'lucide-react'
import { fetchParticipations, drawRandomWinner, type Participation } from '../../../services/participationsApi'
import { useAdminLang } from '../../../lib/adminI18n'
import { normalizeGameId } from '../../../../engine/CampaignEngine'

// Real backend data — one row per completed play (`/api/participate`),
// joined against the `clients` table by phone number. Unlike the old mock
// Participants page, there's no "pending" status: a row only exists once
// someone has actually played, and `is_winner` + the prize tier text
// (`prize_fr`) tell you the outcome.
export default function ParticipantsTab() {
  const { siteId } = useParams()
  const campaign = useCampaignStore((s) => s.campaigns.find((c) => c.id === siteId))
  const slug = campaign?.slug
  // The "Tirer au sort" draw only makes sense for the 'raffle' game type:
  // every other mechanic already gives each player an instant win/lose
  // result, so a manual random pick on top would just surface someone
  // who may already have lost — see the user's call on this.
  const isRaffle = campaign ? normalizeGameId(campaign.game.id) === 'raffle' : false

  const [rows, setRows] = useState<Participation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'winner' | 'no-win'>('all')
  const { t } = useAdminLang()

  // Manual "Tirer au sort" draw — the actual random pick + the winner mark
  // both happen server-side in one transaction (SQL ORDER BY RAND()) over
  // every entrant ever recorded for this campaign, not just whatever's
  // currently loaded in the table below. Used mainly for the 'raffle' game
  // type, whose scan-only flow never runs an instant on-screen draw — the
  // admin runs it by hand instead, and it's a real, persisted write
  // (is_winner=1), not just a preview.
  const [drawOpen, setDrawOpen] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [drawError, setDrawError] = useState<string | null>(null)
  const [drawWinner, setDrawWinner] = useState<Participation | null>(null)
  // Defaults to true: since drawing now permanently marks the pick as a
  // winner, re-running the draw should skip past names already marked
  // rather than risk re-selecting (and re-labelling) the same winner.
  const [excludeWinners, setExcludeWinners] = useState(true)
  const [prizeLabel, setPrizeLabel] = useState('')

  const loadParticipants = () => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchParticipations(slug, { page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return
        setRows(res.items)
        setTotal(res.total)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('participantsTab.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }

  const openDraw = () => {
    setDrawWinner(null)
    setDrawError(null)
    setDrawOpen(true)
  }

  const handleDraw = () => {
    if (!slug) return
    setDrawing(true)
    setDrawError(null)
    drawRandomWinner(slug, { excludeWinners, prizeFr: prizeLabel.trim() })
      .then((p) => {
        setDrawWinner(p)
        // The pick just got persisted as a winner — refresh the table so
        // it shows up there too instead of only inside this dialog.
        loadParticipants()
      })
      .catch((e) => setDrawError(e instanceof Error ? e.message : t('participantsTab.drawError')))
      .finally(() => setDrawing(false))
  }

  useEffect(() => {
    const cleanup = loadParticipants()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const filtered = useMemo(
    () =>
      rows.filter((p) => {
        const q = query.toLowerCase()
        const matchesQuery =
          (p.full_name ?? '').toLowerCase().includes(q) || p.phone_number.toLowerCase().includes(q)
        const matchesStatus = status === 'all' || (status === 'winner' ? p.is_winner : !p.is_winner)
        return matchesQuery && matchesStatus
      }),
    [rows, query, status],
  )

  const winners = rows.filter((p) => p.is_winner).length

  const columns: Column<Participation>[] = [
    {
      key: 'full_name',
      label: t('common.name'),
      sortable: true,
      sortValue: (p) => p.full_name ?? '',
      render: (p) => <span className="font-medium text-[var(--pf-ink)]">{p.full_name || t('participantsTab.unknown')}</span>,
    },
    {
      key: 'phone_number',
      label: t('participantsTab.phone'),
      sortable: true,
      sortValue: (p) => p.phone_number,
      render: (p) => <span className="font-mono tabular text-[13px] text-[var(--pf-ink)]">{p.phone_number}</span>,
    },
    {
      key: 'is_winner',
      label: t('common.status'),
      sortable: true,
      sortValue: (p) => (p.is_winner ? 1 : 0),
      render: (p) => (
        <Badge tone={p.is_winner ? 'success' : 'neutral'} dot>
          {p.is_winner ? t('participantsTab.winner') : t('participantsTab.noPrize')}
        </Badge>
      ),
    },
    {
      key: 'prize_fr',
      label: t('participantsTab.prize'),
      sortable: true,
      sortValue: (p) => p.prize_fr,
      render: (p) => <span className="text-[13px] text-[var(--pf-ink)]">{p.prize_fr}</span>,
    },
    {
      key: 'participation_date',
      label: t('common.date'),
      sortable: true,
      sortValue: (p) => p.participation_date,
      render: (p) => (
        <span className="font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
          {new Date(p.participation_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </span>
      ),
    },
  ]

  if (error) {
    return (
      <div className="flex items-center gap-2.5 rounded-[var(--pf-radius-md)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-4 py-3.5 text-[13px] text-[var(--pf-danger)]">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error} — {t('participantsTab.backendHint')}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput value={query} onChange={setQuery} placeholder={t('participantsTab.searchPlaceholder')} className="w-full max-w-[280px]" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-36">
            <option value="all">{t('participantsTab.allStatuses')}</option>
            <option value="winner">{t('participantsTab.winners')}</option>
            <option value="no-win">{t('participantsTab.noPrize')}</option>
          </Select>
          {loading && (
            <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--pf-ink-faint)]">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('common.loading')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
            {total.toLocaleString('fr-FR')} {t('sidebar.participants').toLowerCase()} · {winners.toLocaleString('fr-FR')} {t('participantsTab.winnersLower')}
          </span>
          {isRaffle && (
            <Button variant="primary" size="sm" icon={<Shuffle className="h-3.5 w-3.5" />} onClick={openDraw} disabled={total === 0}>
              {t('participantsTab.drawRandom')}
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={isRaffle && drawOpen}
        onClose={() => setDrawOpen(false)}
        title={t('participantsTab.drawTitle')}
        description={t('participantsTab.drawDesc')}
        width={420}
      >
        <div className="flex flex-col gap-4 py-2">
          {drawing ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--pf-accent)]" />
              <span className="text-[13px] text-[var(--pf-ink-muted)]">{t('participantsTab.drawing')}</span>
            </div>
          ) : drawError ? (
            <div className="flex items-center gap-2.5 rounded-[var(--pf-radius-md)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-4 py-3.5 text-[13px] text-[var(--pf-danger)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {drawError}
            </div>
          ) : drawWinner ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div
                className="grid h-14 w-14 place-items-center rounded-full text-white"
                style={{ background: 'linear-gradient(155deg, var(--pf-accent), var(--pf-accent-strong))' }}
              >
                <PartyPopper className="h-7 w-7" />
              </div>
              <div>
                <div className="text-[11.5px] uppercase tracking-[0.06em] text-[var(--pf-ink-faint)]">
                  {t('participantsTab.drawWinnerLabel')}
                </div>
                <div className="mt-1 text-[17px] font-semibold text-[var(--pf-ink)]">
                  {drawWinner.full_name || t('participantsTab.unknown')}
                </div>
                <div className="mt-0.5 font-mono text-[13px] tabular text-[var(--pf-ink-muted)]">
                  {drawWinner.phone_number}
                </div>
                <div className="mt-2">
                  <Badge tone="success" dot>
                    {t('participantsTab.drawSaved')}
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}

          <Field label={t('participantsTab.drawPrizeLabel')} hint={t('participantsTab.drawPrizeHint')}>
            <Input
              value={prizeLabel}
              onChange={(e) => setPrizeLabel(e.target.value)}
              placeholder={t('participantsTab.drawPrizePlaceholder')}
              disabled={drawing}
            />
          </Field>

          <label className="flex items-center gap-2 text-[12.5px] text-[var(--pf-ink-muted)]">
            <input
              type="checkbox"
              checked={excludeWinners}
              onChange={(e) => setExcludeWinners(e.target.checked)}
              disabled={drawing}
              className="h-3.5 w-3.5 rounded border-[var(--pf-border-strong)]"
            />
            {t('participantsTab.drawExcludeWinners')}
          </label>

          <Button variant="primary" size="sm" icon={<Shuffle className="h-3.5 w-3.5" />} onClick={handleDraw} disabled={drawing}>
            {drawWinner || drawError ? t('participantsTab.drawAgain') : t('participantsTab.drawRandom')}
          </Button>
        </div>
      </Dialog>

      <div className="mt-4">
        {rows.length === 0 && !loading ? (
          <EmptyState
            title={t('participantsTab.noneYet')}
            description={t('participantsTab.noneYetDesc')}
            icon={<Users className="h-6 w-6" />}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            pageSize={10}
            loading={loading}
            emptyTitle={t('participantsTab.noMatch')}
            emptyDescription={t('participantsTab.noMatchDesc')}
          />
        )}
      </div>

      {total > rows.length && (
        <div className="mt-3">
          <Badge tone="neutral">{t('participantsTab.showingRecent').replace('{shown}', String(rows.length)).replace('{total}', String(total))}</Badge>
        </div>
      )}
    </div>
  )
}
