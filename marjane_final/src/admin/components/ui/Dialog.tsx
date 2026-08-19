import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useAdminLang } from '../../lib/adminI18n'

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  width?: number
}) {
  const { t } = useAdminLang()
  if (typeof document === 'undefined') return null
  // Portals into #pf-portal-root (a child of .admin-shell, see AdminApp.tsx)
  // rather than document.body directly — document.body is outside
  // .admin-shell, so the --pf-* theme variables everything here is styled
  // with wouldn't be in scope there. Falls back to document.body only if
  // that node is somehow missing, so a dialog never fails to render.
  const portalTarget = document.getElementById('pf-portal-root') ?? document.body
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-[#17181c]/45 backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-h-[86vh] w-full overflow-y-auto rounded-[var(--pf-radius-lg)] border border-[var(--pf-border)] bg-white shadow-[var(--pf-shadow-lg)]"
            style={{ maxWidth: width }}
          >
            <div className="flex items-start justify-between border-b border-[var(--pf-border)] px-6 py-4.5">
              <div>
                <h2 className="text-[15.5px] font-semibold text-[var(--pf-ink)]">{title}</h2>
                {description && <p className="mt-1 text-[13px] text-[var(--pf-ink-muted)]">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget,
  )
}

