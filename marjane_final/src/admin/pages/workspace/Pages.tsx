import { useParams, useSearchParams } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { SectionHeading } from '../../components/ui/Basics'
import { Tabs } from '../../components/ui/Tabs'
import ScreensTab from './builder/ScreensTab'
import PrizesTab from './builder/PrizesTab'
import LanguagesTab from './builder/LanguagesTab'
import { useAdminLang } from '../../lib/adminI18n'

// The "Website Builder" is the single home for everything that shapes what
// participants see and play: the live screen-by-screen flow, the game type
// + prize ladder that decides what they can win, and every FR/AR string on
// the site. These used to be three separate sidebar pages (Website Builder,
// Prizes, Languages) — folded into tabs here so the sidebar doesn't force
// the admin to hunt across the nav for things that are really one concern.
const TABS = [
  { id: 'screens', labelKey: 'builder.tabScreens' },
  { id: 'prizes', labelKey: 'builder.tabPrizes' },
  { id: 'languages', labelKey: 'builder.tabLanguages' },
]

const DESCRIPTION_KEYS: Record<string, string> = {
  screens: 'pages.screensDesc',
  prizes: 'pages.prizesDesc',
  languages: 'pages.languagesDesc',
}

export default function Pages() {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useAdminLang()
  const tab = TABS.some((tb) => tb.id === searchParams.get('tab')) ? searchParams.get('tab')! : 'screens'

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
    <div className="pf-fade-in flex h-full flex-col">
      <SectionHeading eyebrow={t('pages.eyebrow')} title={t('builder.title')} description={t(DESCRIPTION_KEYS[tab])} />

      <div className="mt-5">
        <Tabs items={tabItems} active={tab} onChange={setTab} />
      </div>

      <div className="mt-5 flex-1">
        {tab === 'screens' && <ScreensTab onOpenTab={setTab} />}
        {tab === 'prizes' && <PrizesTab />}
        {tab === 'languages' && <LanguagesTab />}
      </div>
    </div>
  )
}
