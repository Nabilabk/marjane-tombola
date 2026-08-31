import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  ChevronDown,
  Check,
  Menu,
  Globe,
  Megaphone,
  LogOut,
  Settings as SettingsIcon,
  User,
  Undo2,
  Redo2,
  X,
} from 'lucide-react'
import { Dropdown, DropdownItem, DropdownLabel } from './ui/Dropdown'
import { usePlatformStore } from '../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { getSession, logout } from '../lib/auth'
import { cn } from '../lib/cn'
import { useAdminLang, type AdminLang } from '../lib/adminI18n'

const LANGS: { id: AdminLang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
]

export function Topbar({
  siteId,
  onMenuClick,
}: {
  siteId: string
  onMenuClick: () => void
}) {
  const navigate = useNavigate()
  const session = getSession()
  const { lang: adminLang, setLang: setAdminLang, t } = useAdminLang()

  const website = usePlatformStore(useShallow((s) => s.websites.find((w) => w.id === siteId)))

  // Pull the raw, store-owned arrays directly (stable references).
  const allCampaigns = usePlatformStore((s) => s.campaigns)
  const allNotifications = usePlatformStore((s) => s.notifications)
  const markAllRead = usePlatformStore((s) => s.markAllNotificationsRead)
  const deleteNotification = usePlatformStore((s) => s.deleteNotification)
  const clearNotifications = usePlatformStore((s) => s.clearNotifications)
  const updateWebsite = usePlatformStore((s) => s.updateWebsite)
  const canUndo = usePlatformStore((s) => s.canUndo)
  const canRedo = usePlatformStore((s) => s.canRedo)
  const undo = usePlatformStore((s) => s.undo)
  const redo = usePlatformStore((s) => s.redo)

  // Filter locally — only recomputes when the raw data or siteId changes.
  const campaigns = useMemo(
    () => allCampaigns.filter((c) => c.websiteId === siteId),
    [allCampaigns, siteId],
  )
  const notifications = useMemo(
    () => allNotifications.filter((n) => n.websiteId === siteId),
    [allNotifications, siteId],
  )

  const [campaign, setCampaign] = useState<string>(campaigns[0]?.id ?? '')

  const unread = notifications.filter((n) => !n.read).length
  const initials = (session?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  // Drives two things at once: the admin's OWN dashboard language (this
  // browser's persistent preference, via AdminLangProvider — sidebar,
  // topbar, every page) and, as before, this campaign's default
  // player-facing language (Settings' "Default language" edits the same
  // field). Same click, two audiences — an admin choosing "English" here
  // almost always wants both.
  function handleLang(id: AdminLang) {
    setAdminLang(id)
    if (website) updateWebsite(website.id, { language: id })
  }

  // Global Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z or Ctrl+Y (redo). Skipped
  // while a text field has focus so it doesn't fight the browser's own
  // native undo inside inputs/textareas.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (!(e.ctrlKey || e.metaKey) || (key !== 'z' && key !== 'y')) return

      const target = e.target as HTMLElement | null
      const isTextField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isTextField) return

      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      } else if (key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3 border-b border-[var(--pf-border)] bg-[var(--pf-surface)]/90 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--pf-radius-sm)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] lg:hidden"
        aria-label={t('topbar.toggleSidebar')}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Breadcrumb */}
      <div className="hidden min-w-0 items-center gap-1.5 md:flex">
        <Link to="/admin" className="text-[12.5px] font-medium text-[var(--pf-ink-faint)] transition-colors hover:text-[var(--pf-ink)]">
          {t('sidebar.workspace')}
        </Link>
        <span className="text-[var(--pf-border-strong)]">/</span>
        {website && (
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
            style={{ background: website.theme.primary }}
            title={t('topbar.brandColor')}
          />
        )}
        <span className="truncate text-[12.5px] font-semibold text-[var(--pf-ink)]">{website?.name}</span>
      </div>

      {/* Undo / redo */}
      <div className="hidden items-center gap-0.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-white p-0.5 sm:flex">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
          title={`${t('topbar.undo')} (Ctrl+Z)`}
          aria-label={t('topbar.undo')}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
          title={`${t('topbar.redo')} (Ctrl+Shift+Z)`}
          aria-label={t('topbar.redo')}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative ml-auto w-full max-w-[220px] sm:max-w-[300px] lg:ml-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pf-ink-faint)]" />
        <input
          type="text"
          placeholder={t('topbar.search')}
          className="h-9 w-full rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-[var(--pf-sunken)]/60 pl-8 pr-3 text-[13px] text-[var(--pf-ink)] placeholder:text-[var(--pf-ink-faint)] transition-all focus:border-[var(--pf-accent)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--pf-accent)]/10"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Campaign selector */}
        <Dropdown
          align="right"
          width={240}
          trigger={
            <button
              type="button"
              className="hidden h-8 items-center gap-1.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-white px-2.5 text-[12.5px] font-medium text-[var(--pf-ink)] transition-colors hover:bg-[var(--pf-sunken)] sm:flex"
            >
              <Megaphone className="h-3.5 w-3.5 text-[var(--pf-ink-faint)]" />
              <span className="max-w-[140px] truncate">
                {campaigns.find((c) => c.id === campaign)?.name ?? t('topbar.allCampaigns')}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--pf-ink-faint)]" />
            </button>
          }
        >
          <DropdownLabel>{t('topbar.campaigns')}</DropdownLabel>
          {campaigns.length === 0 && (
            <div className="px-3.5 py-2 text-[12px] text-[var(--pf-ink-faint)]">{t('topbar.noCampaigns')}</div>
          )}
          {campaigns.map((c) => (
            <DropdownItem key={c.id} active={c.id === campaign} onClick={() => setCampaign(c.id)}>
              <span className="flex-1 truncate">{c.name}</span>
              {c.id === campaign && <Check className="h-3.5 w-3.5" />}
            </DropdownItem>
          ))}
        </Dropdown>

        {/* Language selector */}
        <Dropdown
          align="right"
          width={160}
          trigger={
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-white px-2.5 text-[12.5px] font-medium text-[var(--pf-ink)] transition-colors hover:bg-[var(--pf-sunken)]"
            >
              <Globe className="h-3.5 w-3.5 text-[var(--pf-ink-faint)]" />
              <span className="hidden sm:inline">{adminLang.toUpperCase()}</span>
            </button>
          }
        >
          <DropdownLabel>{t('topbar.language')}</DropdownLabel>
          {LANGS.map((l) => (
            <DropdownItem key={l.id} active={l.id === adminLang} onClick={() => handleLang(l.id)}>
              <span className="flex-1">{l.label}</span>
              {l.id === adminLang && <Check className="h-3.5 w-3.5" />}
            </DropdownItem>
          ))}
        </Dropdown>

        {/* Notifications */}
        <Dropdown
          align="right"
          width={320}
          trigger={
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-white text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)]"
              aria-label={t('topbar.notifications')}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="pf-pulse absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--pf-danger)] font-mono text-[9px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>
          }
        >
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[13px] font-semibold text-[var(--pf-ink)]">{t('topbar.notifications')}</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead.bind(null, siteId)}
                  className="text-[12px] font-medium text-[var(--pf-accent)] hover:underline"
                >
                  {t('topbar.markAllRead')}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('notifications.deleteAllConfirm'))) clearNotifications(siteId)
                  }}
                  className="text-[12px] font-medium text-[var(--pf-ink-faint)] hover:text-[var(--pf-danger)] hover:underline"
                >
                  {t('topbar.clearAll')}
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto border-t border-[var(--pf-border)]">
            {notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-[12.5px] text-[var(--pf-ink-faint)]">
                {t('topbar.caughtUp')}
              </div>
            )}
            {notifications.slice(0, 6).map((n) => (
              <div
                key={n.id}
                className={cn(
                  'group flex gap-3 border-b border-[var(--pf-border)] px-4 py-3 transition-colors last:border-0 hover:bg-[var(--pf-sunken)]/60',
                  !n.read && 'bg-[var(--pf-accent-soft)]/40',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                    n.type === 'success'
                      ? 'bg-[var(--pf-success)]'
                      : n.type === 'warning'
                        ? 'bg-[var(--pf-warning)]'
                        : n.type === 'danger'
                          ? 'bg-[var(--pf-danger)]'
                          : 'bg-[var(--pf-accent)]',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-[var(--pf-ink)]">{n.title}</div>
                  <div className="mt-0.5 truncate text-[12px] text-[var(--pf-ink-muted)]">{n.detail}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-[var(--pf-ink-faint)]">
                    {new Date(n.time).toLocaleDateString(adminLang === 'ar' ? 'ar-MA' : adminLang === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNotification(siteId, n.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] opacity-0 transition-opacity hover:bg-[var(--pf-danger-soft)] hover:text-[var(--pf-danger)] group-hover:opacity-100"
                  aria-label={t('topbar.deleteNotification')}
                  title={t('topbar.deleteNotification')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--pf-border)] p-2">
            <Link
              to={`/admin/site/${siteId}/notifications`}
              className="block rounded-[var(--pf-radius-sm)] px-3 py-2 text-center text-[12.5px] font-medium text-[var(--pf-accent)] transition-colors hover:bg-[var(--pf-accent-soft)]"
            >
              {t('topbar.viewAllNotifications')}
            </Link>
          </div>
        </Dropdown>

        <div className="mx-1 h-5 w-px bg-[var(--pf-border)]" />

        {/* Profile */}
        <Dropdown
          align="right"
          width={220}
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-[var(--pf-radius-sm)] px-1.5 py-1 transition-colors hover:bg-[var(--pf-sunken)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--pf-ink)] font-mono text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[12.5px] font-medium text-[var(--pf-ink)]">
                  {session?.name ?? t('topbar.administrator')}
                </span>
                <span className="block text-[10.5px] text-[var(--pf-ink-faint)]">
                  {session?.email ?? t('topbar.adminEmailFallback')}
                </span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--pf-ink-faint)] xl:block" />
            </button>
          }
        >
          <div className="border-b border-[var(--pf-border)] px-4 py-3">
            <div className="text-[13px] font-semibold text-[var(--pf-ink)]">{session?.name ?? t('topbar.administrator')}</div>
            <div className="mt-0.5 text-[12px] text-[var(--pf-ink-muted)]">{session?.email ?? t('topbar.adminEmailFallback')}</div>
          </div>
          <DropdownItem onClick={() => navigate(`/admin/site/${siteId}/settings`)}>
            <SettingsIcon className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('topbar.accountSettings')}
          </DropdownItem>
          <DropdownItem danger onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> {t('topbar.signOut')}
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}

export { User as TopbarUserIcon }