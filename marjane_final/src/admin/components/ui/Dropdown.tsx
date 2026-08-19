import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'

export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 200,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            style={{ width, [align]: 0 }}
            className="absolute top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-white py-1 shadow-[var(--pf-shadow-lg)]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  danger,
  active,
}: {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium transition-colors',
        danger
          ? 'text-[var(--pf-danger)] hover:bg-[var(--pf-danger-soft)]'
          : active
            ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
            : 'text-[var(--pf-ink)] hover:bg-[var(--pf-sunken)]',
      )}
    >
      {children}
    </button>
  )
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--pf-ink-faint)]">
      {children}
    </div>
  )
}

