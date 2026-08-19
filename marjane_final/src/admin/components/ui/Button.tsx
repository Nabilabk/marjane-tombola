import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--pf-accent)] text-white border border-transparent shadow-[0_1px_2px_rgba(16,17,20,0.12)] hover:bg-[var(--pf-accent-strong)]',
  secondary:
    'bg-white text-[var(--pf-ink)] border border-[var(--pf-border-strong)] hover:bg-[var(--pf-sunken)]',
  outline:
    'bg-transparent text-[var(--pf-ink)] border border-[var(--pf-border-strong)] hover:bg-[var(--pf-sunken)]',
  ghost:
    'bg-transparent text-[var(--pf-ink-muted)] border border-transparent hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]',
  danger: 'bg-[var(--pf-danger)] text-white border border-transparent hover:brightness-110 shadow-[0_1px_2px_rgba(16,17,20,0.12)]',
}

const sizeClass: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-[var(--pf-radius-xs)]',
  sm: 'h-8 px-3 text-[12.5px] gap-1.5',
md: 'h-9 px-4 text-[13.5px] gap-2',
  lg: 'h-11 px-5 text-[14.5px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'secondary', size = 'md', icon, iconRight, loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-[var(--pf-radius-sm)] font-medium transition-all duration-150 active:scale-[0.98]',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 select-none whitespace-nowrap',
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          icon
        )}
        {children}
        {iconRight}
      </button>
    )
  },
)
Button.displayName = 'Button'

