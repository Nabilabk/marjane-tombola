import { useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { usePlatformStore } from '../lib/store'
import { useNotificationFeed } from '../lib/useNotificationFeed'
import { AnimatePresence, motion } from 'framer-motion'
import { useAdminLang } from '../lib/adminI18n'

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { siteId } = useParams()
  const website = usePlatformStore((s) => s.websites.find((w) => w.id === siteId))
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t, dir } = useAdminLang()

  // Polls this site's real backend activity into admin notifications while
  // the workspace is open — see useNotificationFeed.ts.
  useNotificationFeed(website)

  if (!website || !siteId) {
    return (
      <div className="flex h-screen items-center justify-center text-[13.5px] text-[var(--pf-ink-muted)]">
        {t('common.websiteNotFound')}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--pf-bg)]">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar siteId={siteId} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[#17181c]/45 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: dir === 'rtl' ? 280 : -280 }}
              animate={{ x: 0 }}
              exit={{ x: dir === 'rtl' ? 280 : -280 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 start-0 z-50 lg:hidden"
            >
              <Sidebar
                siteId={siteId}
                collapsed={false}
                onToggle={() => setCollapsed((v) => !v)}
                mobile
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar siteId={siteId} onMenuClick={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

