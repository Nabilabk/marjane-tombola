import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { Card } from '../../../components/ui/Basics'
import { StatCard } from '../../../components/ui/StatCard'
import { Select } from '../../../components/ui/Field'
import { dailyParticipation, prizeDistribution, cityBreakdown, hourlyActivity } from '../../../lib/mock-data'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { useState } from 'react'
import { Users, TicketCheck, TrendingUp, Award, Clock, MapPin } from 'lucide-react'
import { useAdminLang } from '../../../lib/adminI18n'

const PIE_COLORS = ['#17181C', '#2D6BE7', '#9B9EA7', '#0E9F6E', '#B45309', '#DC2626']

export default function AnalyticsTab() {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const campaigns = usePlatformStore(useShallow((s) => s.campaignsFor(siteId!)))
  const [range, setRange] = useState('14')
  const { t } = useAdminLang()

  if (!website) return null

  const hasTraffic = website.stats.participants > 0
  const participation = dailyParticipation(website.name.length)
  const prizes = prizeDistribution(campaigns[0]?.prizes ?? [])
  const cities = cityBreakdown()
  const hourly = hourlyActivity()

  return (
    <div>
      <div className="flex justify-end">
        <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-36">
          <option value="7">{t('analyticsTab.last7')}</option>
          <option value="14">{t('analyticsTab.last14')}</option>
          <option value="30">{t('analyticsTab.last30')}</option>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label={t('sidebar.participants')} value={website.stats.participants.toLocaleString('fr-FR')} icon={<Users className="h-4 w-4" />} />
        <StatCard label={t('analyticsTab.ticketsIssued')} value={website.stats.tickets.toLocaleString('fr-FR')} icon={<TicketCheck className="h-4 w-4" />} />
        <StatCard label={t('overviewTab.conversionRate')} value={`${website.stats.conversion}`} suffix="%" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label={t('participantsTab.winners')} value={website.stats.winners.toLocaleString('fr-FR')} icon={<Award className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--pf-ink)]">
            <TrendingUp className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('analyticsTab.participantsVsTickets')}
          </h3>
          {hasTraffic ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={participation} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--pf-border)', boxShadow: 'var(--pf-shadow-md)' }}
                  />
                  <Line type="monotone" dataKey="participants" stroke="var(--pf-accent)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="tickets" stroke="#9B9EA7" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-[13px] text-[var(--pf-ink-faint)]">
              {t('analyticsTab.noParticipationData')}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--pf-ink)]">
            <Award className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('analyticsTab.prizeDistribution')}
          </h3>
          {prizes.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={prizes} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2} stroke="none">
                    {prizes.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--pf-border)', boxShadow: 'var(--pf-shadow-md)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-[13px] text-[var(--pf-ink-faint)]">
              {t('analyticsTab.addPrizesHint')}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--pf-ink)]">
            <MapPin className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('analyticsTab.byCity')}
          </h3>
          {cities.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cities} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                  <XAxis dataKey="city" tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--pf-border)' }} />
                  <Bar dataKey="participants" fill="var(--pf-accent)" radius={[6, 6, 0, 0]} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-[13px] text-[var(--pf-ink-faint)]">
              {t('analyticsTab.noCityData')}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[var(--pf-ink)]">
            <Clock className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('analyticsTab.hourlyScans')}
          </h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="fillH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pf-accent)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--pf-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10.5, fill: 'var(--pf-ink-faint)' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid var(--pf-border)' }} />
                <Area type="monotone" dataKey="scans" stroke="var(--pf-accent)" strokeWidth={2} fill="url(#fillH)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
