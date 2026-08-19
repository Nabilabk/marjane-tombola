import { Input } from './Field'
import { cn } from '../../lib/cn'

const PRESETS = [
  '#17181C', '#5D6068', '#9B9EA7', '#D3D5DA',
  '#2D6BE7', '#1F56C9', '#0E9F6E', '#B45309',
  '#DC2626', '#8B5CF6', '#DB2777', '#0C2340',
]

export function ColorPicker({
  label,
  value,
  onChange,
  presets = PRESETS,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  presets?: string[]
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-[var(--pf-ink)]">{label}</span>
        <span className="font-mono text-[11px] uppercase text-[var(--pf-ink-faint)]">{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#2D6BE7'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-[12.5px]" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'h-5 w-5 rounded-full border transition-transform hover:scale-110',
              value.toLowerCase() === c.toLowerCase()
                ? 'border-[var(--pf-ink)] ring-2 ring-[var(--pf-accent)] ring-offset-1'
                : 'border-black/10',
            )}
            style={{ background: c }}
            aria-label={`Set color ${c}`}
          />
        ))}
      </div>
    </div>
  )
}

