import { cn } from '../../lib/cn'

/**
 * The segmented filter-button row repeated across Notifications, Languages,
 * PlatformDashboard, Campaigns… — same visual pattern, previously
 * reimplemented per page. Generic over any string-valued filter.
 */
export function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors',
            value === opt.value
              ? 'bg-[var(--pf-ink)] text-white'
              : 'text-[var(--pf-ink-muted)] hover:text-[var(--pf-ink)]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
