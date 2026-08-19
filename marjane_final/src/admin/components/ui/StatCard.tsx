import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'success',
  suffix,
  icon,
  hint,
}: {
  label: string
  value: string
  delta?: string
  deltaTone?: 'success' | 'danger' | 'neutral'
  suffix?: string
  icon?: ReactNode
  hint?: string
}) {
  const deltaColor =
    deltaTone === 'success'
      ? 'text-[var(--pf-success)]'
      : deltaTone === 'danger'
        ? 'text-[var(--pf-danger)]'
        : 'text-[var(--pf-ink-faint)]'
  return (
    <div className="group rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4.5 shadow-[var(--pf-shadow-xs)] transition-shadow hover:shadow-[var(--pf-shadow-md)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[var(--pf-ink-muted)]">{label}</span>
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)] transition-colors group-hover:bg-[var(--pf-accent-soft)] group-hover:text-[var(--pf-accent)]">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[26px] font-semibold tracking-[-0.02em] text-[var(--pf-ink)] tabular">
          {value}
        </span>
        {suffix && <span className="text-[12.5px] text-[var(--pf-ink-faint)]">{suffix}</span>}
      </div>
      {delta ? (
        <div className={cn('mt-1.5 flex items-center gap-1 font-mono text-[11.5px] tabular', deltaColor)}>
          {delta}
        </div>
      ) : (
        hint && <div className="mt-1.5 text-[11.5px] text-[var(--pf-ink-faint)]">{hint}</div>
      )}
    </div>
  )
}

