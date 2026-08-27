import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlatformLayout } from '../layouts/PlatformLayout'
import { usePlatformStore } from '../lib/store'
import { Badge, Card, SectionHeading, EmptyState } from '../components/ui/Basics'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { SearchInput } from '../components/ui/SearchInput'
import { FilterPills } from '../components/ui/FilterPills'
import { Dropdown, DropdownItem } from '../components/ui/Dropdown'
import { Plus, MoreHorizontal, Globe, Copy, BarChart3, Trash2, Rocket, Layers, CheckCircle2, Users } from 'lucide-react'
import type { Website } from '../lib/types'
import { useAdminLang } from '../lib/adminI18n'
import { useLiveTotalsForSlugs, type LiveTotals } from '../lib/useLiveTotals'

const STATUS_TONE: Record<Website['status'], 'success' | 'neutral' | 'warning'> = {
  published: 'success',
  draft: 'neutral',
  maintenance: 'warning',
  ended: 'neutral',
}
const STATUS_LABEL_KEY: Record<Website['status'], string> = {
  published: 'platform.statusPublished',
  draft: 'platform.statusDraft',
  maintenance: 'platform.statusMaintenance',
  ended: 'platform.statusEnded',
}

function WebsiteCard({ website, live }: { website: Website; live: LiveTotals | undefined }) {
  const navigate = useNavigate()
  const duplicateWebsite = usePlatformStore((s) => s.duplicateWebsite)
  const deleteWebsite = usePlatformStore((s) => s.deleteWebsite)
  const { t } = useAdminLang()
  // `website.stats.*` (Campaign.analytics) is local, never-synced dead data —
  // real participants/winners live in the backend. Prefer the live fetch
  // once it lands; fall back to the stale field only while it's loading.
  const participants = live?.loading === false ? live.participants : website.stats.participants
  const conversion = live?.loading === false ? live.conversion : website.stats.conversion

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-lg)]">
      <button
        type="button"
        onClick={() => navigate(`/admin/site/${website.id}`)}
        className="flex flex-1 flex-col items-start p-5 text-left"
      >
        <div className="mb-4 flex w-full items-center gap-3 rounded-[var(--pf-radius-sm)] bg-[var(--pf-sunken)] px-4 py-3.5">
          {/* Real brand logo when the site has uploaded one; a plain icon
              tile otherwise — never a generated letter standing in for it. */}
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--pf-border)] bg-white text-white"
            style={!website.theme.logoUrl ? { background: website.theme.primary, borderColor: website.theme.primary } : undefined}
          >
            {website.theme.logoUrl ? (
              <img src={website.theme.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <Globe className="h-[19px] w-[19px]" />
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold tracking-[-0.005em] text-[var(--pf-ink)]">{website.name}</div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--pf-ink-faint)]">{website.domain}</div>
          </div>
        </div>
        <div className="mt-3">
          <Badge tone={STATUS_TONE[website.status]} dot>
            {t(STATUS_LABEL_KEY[website.status])}
          </Badge>
        </div>
        <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t border-[var(--pf-border)] pt-3.5">
          <div>
            <div className="font-mono text-[15px] font-semibold tabular text-[var(--pf-ink)]">
              {website.stats.campaigns}
            </div>
            <div className="text-[10.5px] text-[var(--pf-ink-faint)]">{t('sidebar.campaigns')}</div>
          </div>
          <div>
            <div className="font-mono text-[15px] font-semibold tabular text-[var(--pf-ink)]">
              {participants.toLocaleString('fr-FR')}
            </div>
            <div className="text-[10.5px] text-[var(--pf-ink-faint)]">{t('sidebar.participants')}</div>
          </div>
          <div>
            <div className="font-mono text-[15px] font-semibold tabular text-[var(--pf-ink)]">
              {conversion}%
            </div>
            <div className="text-[10.5px] text-[var(--pf-ink-faint)]">{t('platform.conversion')}</div>
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between border-t border-[var(--pf-border)] bg-[var(--pf-sunken)]/40 px-5 py-2.5">
        <div className="flex gap-1">
          <Link
            to={`/admin/site/${website.id}/theme`}
            className="text-[12px] font-medium text-[var(--pf-ink-muted)] transition-colors hover:text-[var(--pf-accent)]"
          >
            {t('platform.customize')}
          </Link>
          <span className="text-[var(--pf-border-strong)]">·</span>
          <Link
            to={`/admin/site/${website.id}/campaigns`}
            className="text-[12px] font-medium text-[var(--pf-ink-muted)] transition-colors hover:text-[var(--pf-accent)]"
          >
            {t('sidebar.campaigns')}
          </Link>
        </div>
        <Dropdown
          trigger={
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] transition-colors hover:bg-white hover:text-[var(--pf-ink)] hover:shadow-[var(--pf-shadow-xs)]"
              aria-label={t('platform.websiteActions')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem onClick={() => duplicateWebsite(website.id)}>
            <Copy className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('platform.duplicate')}
          </DropdownItem>
          <DropdownItem onClick={() => navigate(`/admin/site/${website.id}?tab=analytics`)}>
            <BarChart3 className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('platform.viewAnalytics')}
          </DropdownItem>
          <DropdownItem danger onClick={() => {
            if (confirm(`"${website.name}" ${t('platform.deleteConfirm')}`)) {
              deleteWebsite(website.id)
            }
          }}>
            <Trash2 className="h-4 w-4" /> {t('common.delete')}
          </DropdownItem>
        </Dropdown>
      </div>
    </Card>
  )
}

export default function PlatformDashboard() {
  const websites = usePlatformStore((s) => s.websites)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | Website['status']>('all')
  const { t } = useAdminLang()

  const slugs = useMemo(() => websites.map((w) => w.slug), [websites])
  const liveTotals = useLiveTotalsForSlugs(slugs)

  const filtered = useMemo(() => {
    return websites.filter((w) => {
      const matchesQuery =
        w.name.toLowerCase().includes(query.toLowerCase()) ||
        w.slug.includes(query.toLowerCase())
      const matchesFilter = filter === 'all' || w.status === filter
      return matchesQuery && matchesFilter
    })
  }, [websites, query, filter])

  const totals = useMemo(
    () => ({
      sites: websites.length,
      published: websites.filter((w) => w.status === 'published').length,
      participants: websites.reduce((sum, w) => {
        const live = liveTotals[w.slug]
        return sum + (live?.loading === false ? live.participants : w.stats.participants)
      }, 0),
    }),
    [websites, liveTotals],
  )

  return (
    <PlatformLayout>
      <div className="mx-auto max-w-[1180px] px-6 py-8 pf-fade-in">
        <SectionHeading
          eyebrow={t('platform.eyebrow')}
          title={t('platform.title')}
          description={t('platform.desc')}
          action={
            <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/admin/create')}>
              {t('platform.newWebsite')}
            </Button>
          }
        />

        {websites.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3.5">
            <StatCard label={t('platform.title')} value={String(totals.sites)} icon={<Layers className="h-4 w-4" />} />
            <StatCard label={t('platform.statusPublished')} value={String(totals.published)} icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label={t('platform.totalParticipants')} value={totals.participants.toLocaleString('fr-FR')} icon={<Users className="h-4 w-4" />} />
          </div>
        )}

        {websites.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <SearchInput value={query} onChange={setQuery} placeholder={t('platform.searchPlaceholder')} className="w-full max-w-[280px]" />
            <FilterPills
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'published', label: t('platform.statusPublished') },
                { value: 'draft', label: t('platform.statusDraft') },
                { value: 'maintenance', label: t('platform.statusMaintenance') },
                { value: 'ended', label: t('platform.statusEnded') },
              ]}
            />
          </div>
        )}

        {websites.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={t('platform.noWebsites')}
              description={t('platform.noWebsitesDesc')}
              icon={<Rocket className="h-6 w-6" />}
              action={
                <Button
                  variant="primary"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/admin/create')}
                >
                  {t('platform.newWebsite')}
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={t('platform.noMatchTitle')}
              description={t('platform.noMatchDesc')}
              action={
                <Button
                  variant="primary"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/admin/create')}
                >
                  {t('platform.newWebsite')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => (
              <WebsiteCard key={w.id} website={w} live={liveTotals[w.slug]} />
            ))}
          </div>
        )}
      </div>
    </PlatformLayout>
  )
}
