import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useAdminLang } from '../../lib/adminI18n'

export function PropertyPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { t } = useAdminLang()
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 320, opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0.6 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-0 top-0 z-30 flex h-full w-[320px] flex-col border-l border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-lg)]"
        >
          <div className="flex items-start justify-between border-b border-[var(--pf-border)] px-5 py-4">
            <div>
              <div className="text-[14px] font-semibold text-[var(--pf-ink)]">{title}</div>
              {subtitle && <div className="mt-0.5 text-[12px] text-[var(--pf-ink-faint)]">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]"
              aria-label={t('propertyPanel.closePanel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-[var(--pf-border)] px-5 py-3.5">{footer}</div>}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export function PropSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--pf-border)] py-4 first:pt-0 last:border-0">
      <div className={cn('mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-ink-faint)]')}>
        {label}
      </div>
      <div className="space-y-3.5">{children}</div>
    </div>
  )
}

export function PropRow({
  label,
  control,
  hint,
}: {
  label: string
  control: ReactNode
  hint?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-[var(--pf-ink)]">{label}</span>
        {hint && <span className="font-mono text-[10.5px] text-[var(--pf-ink-faint)]">{hint}</span>}
      </div>
      {control}
    </div>
  )
}

