import { cn } from '../../lib/cn'

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--pf-border)]">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors',
            active === item.id
              ? 'text-[var(--pf-ink)]'
              : 'text-[var(--pf-ink-muted)] hover:text-[var(--pf-ink)]',
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-mono text-[10.5px] tabular',
                active === item.id
                  ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
                  : 'bg-[var(--pf-sunken)] text-[var(--pf-ink-faint)]',
              )}
            >
              {item.count}
            </span>
          )}
          {active === item.id && (
            <span className="absolute inset-x-2.5 -bottom-px h-[2px] rounded-full bg-[var(--pf-accent)]" />
          )}
        </button>
      ))}
    </div>
  )
}

