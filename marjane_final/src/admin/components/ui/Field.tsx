import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const fieldBase =
  'w-full rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white px-3 text-[13.5px] text-[var(--pf-ink)] placeholder:text-[var(--pf-ink-faint)] shadow-[var(--pf-shadow-xs)] transition-shadow duration-150 focus:outline-none focus:border-[var(--pf-accent)] focus:ring-4 focus:ring-[var(--pf-accent)]/12'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
<input ref={ref} className={cn(fieldBase, 'h-9', className)} {...rest} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'py-2 min-h-[84px] resize-y', className)} {...rest} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        fieldBase,
'h-9 cursor-pointer appearance-none bg-no-repeat bg-[right_10px_center]',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239b9ea7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string
  hint?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-[var(--pf-ink)]">
        {label}
        {required && <span className="text-[var(--pf-danger)]"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-[var(--pf-ink-faint)]">{hint}</span>}
    </label>
  )
}

