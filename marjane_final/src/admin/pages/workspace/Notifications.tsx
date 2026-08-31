import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { SectionHeading, Badge } from '../../components/ui/Basics'
import { Button } from '../../components/ui/Button'
import { FilterPills } from '../../components/ui/FilterPills'
import { cn } from '../../lib/cn'
import { BellRing, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, Inbox, Trash2 } from 'lucide-react'
import { useAdminLang } from '../../lib/adminI18n'

const TYPE_LABEL_KEY: Record<'info' | 'success' | 'warning' | 'danger', string> = {
  info: 'notifications.typeInfo',
  success: 'notifications.typeSuccess',
  warning: 'notifications.typeWarning',
  danger: 'notifications.typeDanger',
}

// Width (px) of the red delete bed once "revealed" by a partial swipe — wide
// enough to comfortably tap the trash icon that sits in it.
const REVEAL_WIDTH = 88
// Distance (px) the row must be dragged left before releasing auto-deletes
// it outright, without needing a second tap on the revealed icon.
const SWIPE_THRESHOLD = 132

/** Wraps a notification row with a swipe-to-delete gesture (iOS Mail style):
 * dragging left partially snaps the row open, revealing a red "delete" bed
 * with a trash button underneath — tapping that button removes the
 * notification. Dragging all the way past SWIPE_THRESHOLD deletes it
 * outright on release, no extra tap needed. Pointer capture keeps tracking
 * the drag even if the cursor leaves the row mid-swipe, and dragging starts
 * from wherever the row currently sits so an already-open row can be swiped
 * shut again. */
function SwipeableRow({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const startX = useRef(0)
  const baseX = useRef(0)
  const moved = useRef(false)

  function remove() {
    setRemoving(true)
    setDragX(-480)
    window.setTimeout(onDelete, 180)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (removing) return
    startX.current = e.clientX
    baseX.current = dragX
    moved.current = false
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 4) moved.current = true
    setDragX(Math.min(0, baseX.current + delta))
  }

  function endDrag() {
    if (!dragging) return
    setDragging(false)
    if (dragX <= -SWIPE_THRESHOLD) {
      remove()
    } else if (!moved.current) {
      // A plain tap/click on the row (not a drag) always closes it — the
      // revealed trash button has its own click handler for deleting.
      setDragX(0)
    } else {
      setDragX(dragX <= -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--pf-radius-md)]">
      <button
        type="button"
        onClick={remove}
        aria-label={label}
        className="absolute inset-0 flex items-center justify-end gap-2 rounded-[var(--pf-radius-md)] bg-[var(--pf-danger)] px-5 text-white"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div
        className={cn('touch-pan-y', dragging && 'select-none')}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease',
          opacity: removing ? 0 : 1,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </div>
  )
}

export default function Notifications() {
  const { siteId } = useParams()
  const notifications = usePlatformStore(useShallow((s) => s.notificationsFor(siteId!)))
  const markAllRead = usePlatformStore((s) => s.markAllNotificationsRead)
  const deleteNotification = usePlatformStore((s) => s.deleteNotification)
  const clearNotifications = usePlatformStore((s) => s.clearNotifications)
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

  function handleDeleteAll() {
    if (window.confirm(t('notifications.deleteAllConfirm'))) clearNotifications(siteId!)
  }

  return (
    <div className="pf-fade-in">
      <SectionHeading
        eyebrow={t('notifications.eyebrow')}
        title={t('notifications.title')}
        description={t('notifications.desc')}
        action={
          <>
            <Button variant="secondary" icon={<CheckCheck className="h-3.5 w-3.5" />} onClick={() => markAllRead(siteId!)}>
              {t('notifications.markAllRead')}
            </Button>
            {notifications.length > 0 && (
              <Button variant="outline" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={handleDeleteAll}>
                {t('notifications.deleteAll')}
              </Button>
            )}
          </>
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

      {filtered.length > 0 && (
        <div className="mt-3 text-[11.5px] text-[var(--pf-ink-faint)] sm:hidden">{t('notifications.swipeHint')}</div>
      )}

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
              <SwipeableRow key={n.id} label={`${t('notifications.delete')}: ${n.title}`} onDelete={() => deleteNotification(siteId!, n.id)}>
                <div
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
                  <button
                    type="button"
                    onClick={() => deleteNotification(siteId!, n.id)}
                    className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] transition-colors hover:bg-[var(--pf-danger-soft)] hover:text-[var(--pf-danger)]"
                    aria-label={t('notifications.delete')}
                    title={t('notifications.delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </SwipeableRow>
            )
          })
        )}
      </div>
    </div>
  )
}
