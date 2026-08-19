import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Search, LogOut, ChevronDown, Users } from 'lucide-react'
import { Input } from '../components/ui/Field'
import { Dropdown, DropdownItem, DropdownLabel } from '../components/ui/Dropdown'
import { getSession, logout } from '../lib/auth'
import { useAdminLang } from '../lib/adminI18n'

export function PlatformLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const session = getSession()
  const { t } = useAdminLang()
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

  return (
    <div className="min-h-screen bg-[var(--pf-bg)]">
      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-4 border-b border-[var(--pf-border)] bg-[var(--pf-surface)]/90 px-4 backdrop-blur-md sm:px-6">
        <Link to="/admin" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0C2340]">
            <img src="/marjane-mark-white.png" alt="Marjane" className="h-5 w-5 object-contain" />
          </span>
          <span className="hidden text-[14.5px] font-semibold tracking-[-0.01em] text-[var(--pf-ink)] sm:block">
            Marjane Campaign Studio
          </span>
        </Link>

        <div className="hidden max-w-sm flex-1 items-center justify-center px-8 md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pf-ink-faint)]" />
            <Input placeholder={t('platform.searchWebsitesCampaigns')} className="pl-8" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session?.role === 'super_admin' && (
            <Link
              to="/admin/team"
              className="hidden items-center gap-1.5 rounded-[var(--pf-radius-sm)] px-3 py-1.5 text-[13px] font-medium text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)] sm:flex"
            >
              <Users className="h-3.5 w-3.5" /> {t('sidebar.team')}
            </Link>
          )}
          <button
            type="button"
className="relative flex h-8 w-8 items-center justify-center rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-white text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)]"
            aria-label={t('topbar.notifications')}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--pf-danger)] font-mono text-[8.5px] font-semibold text-white">
              2
            </span>
          </button>

          <div className="mx-1 h-5 w-px bg-[var(--pf-border)]" />

          <Dropdown
            trigger={
              <button type="button" className="flex items-center gap-2 rounded-[var(--pf-radius-sm)] px-1.5 py-1 transition-colors hover:bg-[var(--pf-sunken)]">
<span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--pf-ink)] font-mono text-[11px] font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden text-left leading-tight lg:block">
                  <span className="block text-[12.5px] font-medium text-[var(--pf-ink)]">
                    {session?.name ?? 'Administrator'}
                  </span>
                  <span className="block text-[10.5px] text-[var(--pf-ink-faint)]">
                    {session?.email ?? 'admin'}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--pf-ink-faint)] lg:block" />
              </button>
            }
          >
            <DropdownLabel>{t('platform.account')}</DropdownLabel>
            <DropdownItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 text-[var(--pf-ink-faint)]" /> {t('topbar.signOut')}
            </DropdownItem>
          </Dropdown>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

