import { Search } from 'lucide-react'
import { Input } from './Field'
import { cn } from '../../lib/cn'

/**
 * The icon+input search pattern repeated near-identically across Assets,
 * Participants, Tickets, Languages, PlatformDashboard, Products… — extracted
 * so the affordance (icon position, placeholder styling) stays consistent
 * everywhere it's used instead of being copy-pasted per page.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pf-ink-faint)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}
