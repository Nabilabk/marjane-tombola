import { useParams, useSearchParams } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { SectionHeading } from '../../components/ui/Basics'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { Play } from 'lucide-react'
import OverviewTab from './dashboard/OverviewTab'
import TicketsTab from './dashboard/TicketsTab'
import ParticipantsTab from './dashboard/ParticipantsTab'
import AnalyticsTab from './dashboard/AnalyticsTab'
import { useAdminLang } from '../../lib/adminI18n'

// The Dashboard is the single home for "how is this campaign doing":
// the at-a-glance overview, real scanned tickets, real participants, and
// the deeper analytics charts. These used to be four separate sidebar
// pages — folded into tabs here so checking on a campaign doesn't mean
// hopping across four different nav entries.
const TABS = [
  { id: 'overview', labelKey: 'sidebar.overview' },
  { id: 'tickets', labelKey: 'sidebar.tickets' },
  { id: 'participants', labelKey: 'sidebar.participants' },
  { id: 'analytics', labelKey: 'sidebar.analytics' },
]

export default function Overview() {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useAdminLang()
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab')! : 'overview'

  function setTab(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', id)
      return next
    })
  }

  if (!website) {
    return (
      <div className="flex h-64 items-center justify-center text-[13.5px] text-[var(--pf-ink-muted)]">
        {t('common.websiteNotFound')}
      </div>
    )
  }

  const tabItems = TABS.map((tb) => ({ id: tb.id, label: t(tb.labelKey) }))

  return (
    <div className="pf-fade-in">
      <SectionHeading
        eyebrow={t('overview.eyebrow')}
        title={t('sidebar.dashboard')}
        description={t('overview.welcomeBack').replace('{name}', website.name)}
        action={
          <Button variant="primary" icon={<Play className="h-3.5 w-3.5" />}>
            {website.status === 'published' ? t('overview.update') : t('overview.publish')}
          </Button>
        }
      />

      <div className="mt-6">
        <Tabs items={tabItems} active={tab} onChange={setTab} />
      </div>

      <div className="mt-5">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'tickets' && <TicketsTab />}
        {tab === 'participants' && <ParticipantsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  )
}
