import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  Palette,
  LayoutTemplate,
  Package,
  Images,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  PanelLeft,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { usePlatformStore } from '../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { logout } from '../lib/auth'
import { cn } from '../lib/cn'
import { useAdminLang } from '../lib/adminI18n'

export interface NavItem {
  to: string
  /** An adminI18n dict key (e.g. 'sidebar.dashboard'), resolved via t() at
   *  render time — not the display string itself, since this array is a
   *  static module-level export and can't call the useAdminLang hook. */
  label: string
  icon: typeof LayoutDashboard
  badge?: string
  end?: boolean
}

// Dashboard now hosts Overview/Tickets/Participants/Analytics as tabs, and
// Website Builder hosts Screens/Prizes/Languages as tabs — six former
// top-level entries folded into the two pages that actually own them.
export const WORKSPACE_NAV: NavItem[] = [
  { to: '', label: 'sidebar.dashboard', icon: LayoutDashboard, end: true },
  { to: 'campaigns', label: 'sidebar.campaigns', icon: Megaphone },
  { to: 'theme', label: 'sidebar.themeEditor', icon: Palette },
  { to: 'pages', label: 'sidebar.websiteBuilder', icon: LayoutTemplate },
  { to: 'products', label: 'sidebar.products', icon: Package },
  { to: 'assets', label: 'sidebar.mediaLibrary', icon: Images },
  { to: 'notifications', label: 'sidebar.notifications', icon: Bell },
  { to: 'settings', label: 'sidebar.settings', icon: Settings },
]

export function Sidebar({
  siteId,
  collapsed,
  onToggle,
  mobile,
  onClose,
}: {
  siteId: string
  collapsed: boolean
  onToggle: () => void
  mobile?: boolean
  onClose?: () => void
}) {
  const navigate = useNavigate()
  const { t } = useAdminLang()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const unread = usePlatformStore(useShallow((s) => s.notificationsFor(siteId).filter((n) => !n.read).length))

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const shell = (
    <div
      className={cn(
        'flex h-full flex-col bg-[var(--pf-surface)]',
        mobile ? 'w-[var(--pf-sidebar-w)]' : collapsed ? 'w-[var(--pf-sidebar-w-collapsed)]' : 'w-[var(--pf-sidebar-w)]',
        'border-e border-[var(--pf-border)] transition-[width] duration-200 ease-out',
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-[60px] shrink-0 items-center gap-2.5 border-b border-[var(--pf-border)] px-4', collapsed && !mobile && 'justify-center px-0')}>
        {!collapsed || mobile ? (
          <>
            <Link to={`/admin/site/${siteId}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-accent)] text-white">
              <Sparkles className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold text-[var(--pf-ink)]">{website?.name ?? t('sidebar.workspace')}</div>
              <div className="truncate font-mono text-[10.5px] text-[var(--pf-ink-faint)]">
                {website?.domain ?? ''}
              </div>
            </div>
          </>
        ) : (
          <Link to={`/admin/site/${siteId}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-accent)] text-white">
            <Sparkles className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {WORKSPACE_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={`/admin/site/${siteId}/${item.to}`}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 rounded-[var(--pf-radius-sm)] px-2.5 py-2 text-[13px] font-medium transition-colors',
                  collapsed && !mobile && 'justify-center px-0',
                  isActive
                    ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
                    : 'text-[var(--pf-ink-muted)] hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]',
                )
              }
              title={collapsed && !mobile ? t(item.label) : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId={mobile ? 'mobile-nav' : 'nav-active'}
                      className="absolute start-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-[var(--pf-accent)]"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--pf-accent)]' : 'text-[var(--pf-ink-faint)] group-hover:text-[var(--pf-ink-muted)]')} />
                  {(!collapsed || mobile) && <span className="flex-1 truncate">{t(item.label)}</span>}
                  {(!collapsed || mobile) && item.badge && (
                    <span className="rounded-full bg-[var(--pf-accent-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--pf-accent)]">
                      {item.badge}
                    </span>
                  )}
                  {item.label === 'sidebar.notifications' && !collapsed && unread > 0 && (
                    <span className="rounded-full bg-[var(--pf-danger)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                      {unread}
                    </span>
                  )}
                  {collapsed && !mobile && (
                    <span className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 -translate-y-1/2 whitespace-nowrap rounded-[var(--pf-radius-xs)] bg-[var(--pf-ink)] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-[var(--pf-shadow-md)] transition-opacity group-hover:opacity-100">
                      {t(item.label)}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--pf-border)] p-2.5">
        {!collapsed || mobile ? (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-[var(--pf-radius-sm)] px-2.5 py-2 text-[13px] font-medium text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-danger-soft)] hover:text-[var(--pf-danger)]"
          >
            <LogOut className="h-4 w-4" />
            {t('sidebar.logout')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-[var(--pf-radius-sm)] py-2 text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-danger-soft)] hover:text-[var(--pf-danger)]"
            title={t('sidebar.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      {!mobile && (
        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 items-center justify-center gap-2 border-t border-[var(--pf-border)] text-[11px] font-medium text-[var(--pf-ink-faint)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]"
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <><PanelLeft className="h-3.5 w-3.5" /> {t('sidebar.collapse')}</>}
        </button>
      )}
    </div>
  )

  if (mobile) return shell
  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose} />
      {shell}
    </>
  )
}

// Re-export ChevronsLeft to avoid unused import warnings in callers that use it
export const SidebarChevronLeft = ChevronsLeft

