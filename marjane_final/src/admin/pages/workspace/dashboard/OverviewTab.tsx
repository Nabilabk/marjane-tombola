import { Link, useParams } from 'react-router-dom'
import { usePlatformStore } from '../../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { Card, Badge, EmptyState } from '../../../components/ui/Basics'
import { StatCard } from '../../../components/ui/StatCard'
import { Button } from '../../../components/ui/Button'
import { dailyParticipation } from '../../../lib/mock-data'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import {
  Users,
  Gift,
  TrendingUp,
  ArrowRight,
  Megaphone,
  Palette,
  LayoutTemplate,
  Settings,
} from 'lucide-react'
import { useAdminLang } from '../../../lib/adminI18n'

// Shared with Campaigns.tsx's STATUS_COLUMNS — same three campaign statuses.
const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'campaigns.statusDraft',
  active: 'campaigns.statusActive',
  finished: 'campaigns.statusFinished',
}

const QUICK_ACTIONS = [
  { labelKey: 'overviewTab.editTheme', descKey: 'overviewTab.editThemeDesc', to: 'theme', icon: Palette },
  { labelKey: 'overviewTab.websiteBuilder', descKey: 'overviewTab.websiteBuilderDesc', to: 'pages', icon: LayoutTemplate },
  { labelKey: 'overviewTab.newCampaign', descKey: 'overviewTab.newCampaignDesc', to: 'campaigns', icon: Megaphone },
  { labelKey: 'sidebar.settings', descKey: 'overviewTab.settingsDesc', to: 'settings', icon: Settings },
]

export default function OverviewTab() {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const campaigns = usePlatformStore(useShallow((s) => s.campaignsFor(siteId!)))
  const activity = usePlatformStore(useShallow((s) => s.activityFor(siteId!)))
  const { t } = useAdminLang()

  if (!website) return null

  const data = dailyParticipation(website.name.length)

  const stats = [
    {
      label: t('sidebar.participants'),
      value: website.stats.participants.toLocaleString('fr-FR'),
      delta: website.stats.participants > 0 ? '+12%' : '—',
      deltaTone: website.stats.participants > 0 ? ('success' as const) : ('neutral' as const),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: t('overviewTab.rewardsWon'),
      value: website.stats.winners.toLocaleString('fr-FR'),
      delta: website.stats.winners > 0 ? '+15%' : '—',
      deltaTone: website.stats.winners > 0 ? ('success' as const) : ('neutral' as const),
      icon: <Gift className="h-4 w-4" />,
    },
    {
      label: t('overviewTab.conversionRate'),
      value: String(website.stats.conversion),
      suffix: '%',
      delta: website.stats.conversion > 0 ? '+2.4%' : '—',
      deltaTone: website.stats.conversion > 0 ? ('success' as const) : ('neutral' as const),
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ]

  const activeCampaign = campaigns.find((c) => c.status === 'active')

  return (
    <div>
      {/* Stat cards — ticket/participant counts live on their own tabs now */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--pf-ink)]">{t('overviewTab.participationChart')}</h3>
            <Badge tone="neutral">{t('common.live')}</Badge>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="fillP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pf-accent)" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="var(--pf-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--pf-border)', boxShadow: 'var(--pf-shadow-md)' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="participants" stroke="var(--pf-accent)" strokeWidth={2.5} fill="url(#fillP)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--pf-ink)]">{t('overviewTab.recentActivity')}</h3>
            <span className="font-mono text-[11px] text-[var(--pf-ink-faint)]">
              {activity.length} {t('overviewTab.events')}
            </span>
          </div>
          <div className="space-y-4">
            {activity.length === 0 && (
              <p className="text-[12.5px] text-[var(--pf-ink-muted)]">
                {t('overviewTab.activityEmpty')}
              </p>
            )}
            {activity.slice(0, 5).map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--pf-accent)]" />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-[var(--pf-ink)]">{a.label}</div>
                  <div className="mt-0.5 text-[12px] text-[var(--pf-ink-muted)]">{a.detail}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-[var(--pf-ink-faint)]">
                    {new Date(a.time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Campaign status */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[var(--pf-ink)]">{t('overviewTab.campaignStatus')}</h3>
            <Link to="campaigns" className="flex items-center gap-1 text-[12px] font-medium text-[var(--pf-accent)] hover:underline">
              {t('overviewTab.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {campaigns.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] px-3.5 py-3 transition-colors hover:bg-[var(--pf-sunken)]/50">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[var(--pf-ink)]">{c.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[var(--pf-ink-faint)] tabular">
                    {c.participants.toLocaleString('fr-FR')} {t('sidebar.participants').toLowerCase()}
                  </div>
                </div>
                <Badge tone={c.status === 'active' ? 'success' : c.status === 'draft' ? 'neutral' : 'warning'} dot>
                  {t(STATUS_LABEL_KEY[c.status] ?? c.status)}
                </Badge>
              </div>
            ))}
            {campaigns.length === 0 && (
              <EmptyState
                title={t('overviewTab.noCampaigns')}
                description={t('overviewTab.noCampaignsDesc')}
                action={
                  <Link to="campaigns">
                    <Button variant="primary" size="sm" icon={<Megaphone className="h-3.5 w-3.5" />}>
                      {t('overviewTab.createCampaign')}
                    </Button>
                  </Link>
                }
              />
            )}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-5">
          <h3 className="mb-4 text-[14px] font-semibold text-[var(--pf-ink)]">{t('overviewTab.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon
              return (
                <Link
                  key={a.labelKey}
                  to={a.to}
                  className="group flex flex-col gap-2.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-3.5 transition-all hover:border-[var(--pf-accent)] hover:bg-[var(--pf-accent-soft)]/50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)] transition-colors group-hover:bg-white group-hover:text-[var(--pf-accent)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-semibold text-[var(--pf-ink)]">{t(a.labelKey)}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--pf-ink-faint)]">{t(a.descKey)}</span>
                  </span>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-[var(--pf-radius-sm)] bg-[var(--pf-sunken)] px-3.5 py-3">
            <div>
              <div className="text-[12px] font-medium text-[var(--pf-ink)]">{t('overviewTab.liveCampaign')}</div>
              <div className="mt-0.5 text-[11px] text-[var(--pf-ink-muted)]">
                {activeCampaign ? activeCampaign.name : t('overviewTab.noActiveCampaign')}
              </div>
            </div>
            <Badge tone={activeCampaign ? 'success' : 'neutral'} dot>
              {activeCampaign ? t('common.active') : t('common.idle')}
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  )
}
