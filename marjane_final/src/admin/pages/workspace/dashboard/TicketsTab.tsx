import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore as useCampaignStore } from '../../../../platform/store'
import { Badge } from '../../../components/ui/Basics'
import { StatCard } from '../../../components/ui/StatCard'
import { DataTable } from '../../../components/ui/DataTable'
import type { Column } from '../../../components/ui/DataTable'
import { SearchInput } from '../../../components/ui/SearchInput'
import { ScanLine, Receipt as ReceiptIcon, Store, Loader2, AlertTriangle } from 'lucide-react'
import { fetchReceipts, type Receipt } from '../../../services/receiptsApi'
import { useAdminLang } from '../../../lib/adminI18n'

// Real backend data — every row here passed OCR + duplicate + minimum-amount
// + product-rule validation server-side (see backend/app.py's
// `validate_receipt`); a rejected scan is never persisted, so there is no
// "invalid" status to show, unlike the old mock Tickets page.
export default function TicketsTab() {
  const { siteId } = useParams()
  const slug = useCampaignStore((s) => s.campaigns.find((c) => c.id === siteId))?.slug

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const { t } = useAdminLang()

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchReceipts(slug, { page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return
        setReceipts(res.items)
        setTotal(res.total)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('ticketsTab.loadError'))
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
      receipts.filter((r) => {
        const q = query.toLowerCase()
        return (
          (r.receipt_number ?? '').toLowerCase().includes(q) ||
          (r.user_id ?? '').toLowerCase().includes(q) ||
          (r.store ?? '').toLowerCase().includes(q)
        )
      }),
    [receipts, query],
  )

  const totalValue = receipts.reduce((s, r) => s + r.total, 0)
  const stores = new Set(receipts.map((r) => r.store).filter(Boolean)).size

  const columns: Column<Receipt>[] = [
    {
      key: 'receipt_number',
      label: t('ticketsTab.receipt'),
      sortable: true,
      sortValue: (r) => r.receipt_number ?? '',
      render: (r) => (
        <span className="font-mono text-[12.5px] font-medium text-[var(--pf-ink)]">
          {r.receipt_number || `#${r.id}`}
        </span>
      ),
    },
    {
      key: 'user_id',
      label: t('sidebar.participants').replace(/s$/, ''),
      sortable: true,
      sortValue: (r) => r.user_id ?? '',
      render: (r) => <span className="font-medium text-[var(--pf-ink)]">{r.user_id || '—'}</span>,
    },
    {
      key: 'store',
      label: t('ticketsTab.store'),
      sortable: true,
      sortValue: (r) => r.store ?? '',
      render: (r) => <span className="text-[var(--pf-ink-muted)]">{r.store || '—'}</span>,
    },
    {
      key: 'total',
      label: t('ticketsTab.amount'),
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => <span className="font-mono tabular text-[13px]">{r.total.toFixed(2)} MAD</span>,
    },
    {
      key: 'created_at',
      label: t('ticketsTab.scanned'),
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => (
        <span className="font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
          {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
        <StatCard
          label={t('sidebar.tickets')}
          value={total.toLocaleString('fr-FR')}
          icon={<ScanLine className="h-4 w-4" />}
          delta={total > 0 ? t('ticketsTab.validatedReceipts') : '—'}
          deltaTone="neutral"
        />
        <StatCard
          label={t('ticketsTab.totalValue')}
          value={totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
          suffix=" MAD"
          icon={<ReceiptIcon className="h-4 w-4" />}
        />
        <StatCard label={t('ticketsTab.stores')} value={stores.toLocaleString('fr-FR')} icon={<Store className="h-4 w-4" />} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <SearchInput value={query} onChange={setQuery} placeholder={t('ticketsTab.searchPlaceholder')} className="w-full max-w-[280px]" />
        {loading && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--pf-ink-faint)]">
            <Loader2 className="h-3 w-3 animate-spin" /> {t('common.loading')}
          </span>
        )}
        <span className="ml-auto font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
          {filtered.length} {t('ticketsTab.of')} {total} {t('sidebar.tickets').toLowerCase()}
        </span>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={filtered}
          pageSize={8}
          emptyTitle={t('ticketsTab.notFound')}
          emptyDescription={t('ticketsTab.notFoundDesc')}
        />
      </div>

      {total > receipts.length && (
        <div className="mt-3 flex items-center gap-2">
          <Badge tone="neutral">{t('participantsTab.showingRecent').replace('{shown}', String(receipts.length)).replace('{total}', String(total))}</Badge>
        </div>
      )}
    </div>
  )
}
