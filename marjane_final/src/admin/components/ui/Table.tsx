import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)]">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  )
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-[var(--pf-border)] bg-[var(--pf-sunken)] px-4 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.04em] text-[var(--pf-ink-faint)]',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-[var(--pf-border)] px-4 py-3 text-[var(--pf-ink)] align-middle', className)} {...rest}>
      {children}
    </td>
  )
}

export function Tr({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors hover:bg-[var(--pf-sunken)]/60', className)} {...rest}>
      {children}
    </tr>
  )
}
