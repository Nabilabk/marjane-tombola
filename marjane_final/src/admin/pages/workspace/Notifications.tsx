import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { SectionHeading, Badge } from '../../components/ui/Basics'
import { Button } from '../../components/ui/Button'
import { FilterPills } from '../../components/ui/FilterPills'
import { cn } from '../../lib/cn'
import { BellRing, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, Inbox } from 'lucide-react'
import { useAdminLang } from '../../lib/adminI18n'

const TYPE_LABEL_KEY: Record<'info' | 'success' | 'warning' | 'danger', string> = {
  info: 'notifications.typeInfo',
  success: 'notifications.typeSuccess',
  warning: 'notifications.typeWarning',
  danger: 'notifications.typeDanger',
}

export default function Notifications() {
  const { siteId } = useParams()
  const notifications = usePlatformStore(useShallow((s) => s.notificationsFor(siteId!)))
  const markAllRead = usePlatformStore((s) => s.markAllNotificationsRead)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { t } = useAdminLang()

  const filtered = useMemo(
    () => notifications.filter((n) => filter === 'all' || !n.read),
    [notifications, filter],
  )

  const unread = notifications.filter((n) => !n.read).length

  const typeMeta = {
    info: { icon: Info, tone: 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]' },
    success: { icon: CheckCircle2, tone: 'bg-[var(--pf-success-soft)] text-[var(--pf-success)]' },
    warning: { icon: AlertTriangle, tone: 'bg-[var(--pf-warning-soft)] text-[var(--pf-warning)]' },
    danger: { icon: XCircle, tone: 'bg-[var(--pf-danger-soft)] text-[var(--pf-danger)]' },
  }

  return (
    <div className="pf-fade-in">
      <SectionHeading
        eyebrow={t('notifications.eyebrow')}
        title={t('notifications.title')}
        description={t('notifications.desc')}
        action={
          <Button variant="secondary" icon={<CheckCheck className="h-3.5 w-3.5" />} onClick={() => markAllRead(siteId!)}>
            {t('notifications.markAllRead')}
          </Button>
        }
      />

      <div className="mt-6 flex items-center gap-2">
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `${t('common.all')} (${notifications.length})` },
            { value: 'unread', label: `${t('notifications.unread')} (${unread})` },
          ]}
        />
        <span className="ml-auto flex items-center gap-2 font-mono text-[11.5px] text-[var(--pf-ink-faint)]">
          <BellRing className="h-3.5 w-3.5" /> {unread} {t('notifications.unreadLower')}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-[var(--pf-radius-md)] border border-dashed border-[var(--pf-border-strong)] py-16 text-center">
            <Inbox className="mb-3 h-8 w-8 text-[var(--pf-ink-faint)]" />
            <div className="text-[14px] font-semibold text-[var(--pf-ink)]">{t('notifications.empty')}</div>
            <div className="mt-1 text-[12.5px] text-[var(--pf-ink-muted)]">
              {filter === 'unread' ? t('notifications.noneUnread') : t('notifications.noneAtAll')}
            </div>
          </div>
        ) : (
          filtered.map((n) => {
            const meta = typeMeta[n.type]
            const Icon = meta.icon
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 rounded-[var(--pf-radius-md)] border bg-white p-4 shadow-[var(--pf-shadow-xs)] transition-colors hover:border-[var(--pf-border-strong)]',
                  !n.read ? 'border-[var(--pf-accent)]/30' : 'border-[var(--pf-border)]',
                )}
              >
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--pf-radius-md)]', meta.tone)}>
<Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-[var(--pf-ink)]">{n.title}</span>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-[var(--pf-accent)]" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-[var(--pf-ink-muted)]">{n.detail}</div>
                  <div className="mt-1.5 font-mono text-[11px] text-[var(--pf-ink-faint)]">
                    {new Date(n.time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Badge tone={n.type === 'danger' ? 'danger' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'accent'}>
                  {t(TYPE_LABEL_KEY[n.type])}
                </Badge>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
