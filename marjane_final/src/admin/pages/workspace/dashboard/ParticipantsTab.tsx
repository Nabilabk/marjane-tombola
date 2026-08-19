import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore as useCampaignStore } from '../../../../platform/store'
import { Badge, EmptyState } from '../../../components/ui/Basics'
import { DataTable } from '../../../components/ui/DataTable'
import type { Column } from '../../../components/ui/DataTable'
import { Select } from '../../../components/ui/Field'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Loader2, Users, AlertTriangle } from 'lucide-react'
import { fetchParticipations, type Participation } from '../../../services/participationsApi'
import { useAdminLang } from '../../../lib/adminI18n'

// Real backend data — one row per completed play (`/api/participate`),
// joined against the `clients` table by phone number. Unlike the old mock
// Participants page, there's no "pending" status: a row only exists once
// someone has actually played, and `is_winner` + the prize tier text
// (`prize_fr`) tell you the outcome.
export default function ParticipantsTab() {
  const { siteId } = useParams()
  const slug = useCampaignStore((s) => s.campaigns.find((c) => c.id === siteId))?.slug

  const [rows, setRows] = useState<Participation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'winner' | 'no-win'>('all')
  const { t } = useAdminLang()

  useEffect(() => {
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
        <span className="font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
          {total.toLocaleString('fr-FR')} {t('sidebar.participants').toLowerCase()} · {winners.toLocaleString('fr-FR')} {t('participantsTab.winnersLower')}
        </span>
      </div>

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
