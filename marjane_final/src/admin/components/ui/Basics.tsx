import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'blue'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)] border-transparent',
  success: 'bg-[var(--pf-success-soft)] text-[var(--pf-success)] border-transparent',
  warning: 'bg-[var(--pf-warning-soft)] text-[var(--pf-warning)] border-transparent',
  danger: 'bg-[var(--pf-danger-soft)] text-[var(--pf-danger)] border-transparent',
  accent: 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)] border-transparent',
  blue: 'bg-[var(--pf-accent)] text-white border-transparent',
}

export function Badge({ tone = 'neutral', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11.5px] font-medium leading-none',
        toneClass[tone],
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'neutral' ? 'bg-[var(--pf-ink-faint)]' : tone === 'blue' ? 'bg-white/80' : 'bg-current',
          )}
        />
      )}
      {children}
    </span>
  )
}

export function Card({ className, hover, ...rest }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-xs)]',
        hover && 'pf-hover-lift',
        className,
      )}
      {...rest}
    />
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-[var(--pf-border)]', className)} />
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--pf-radius-md)] border border-dashed border-[var(--pf-border-strong)] bg-[var(--pf-surface)] px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--pf-radius-md)] bg-[var(--pf-sunken)] text-[var(--pf-ink-faint)]">
          {icon}
        </div>
      )}
      <h3 className="text-[14.5px] font-semibold text-[var(--pf-ink)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] text-[var(--pf-ink-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--pf-ink-faint)]">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--pf-ink)]">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-[var(--pf-ink-muted)]">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pf-skeleton', className)} />
}

