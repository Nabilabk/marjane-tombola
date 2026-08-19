import { cn } from '../../lib/cn'

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[13px] font-medium text-[var(--pf-ink)]">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-[12px] text-[var(--pf-ink-muted)]">{description}</span>
          )}
        </span>
      )}
      <span
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--pf-accent)]' : 'bg-[var(--pf-sunken-2)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

