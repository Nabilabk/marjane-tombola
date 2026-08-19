import { useRef, useState } from 'react'
import { ImageIcon, Upload, X } from 'lucide-react'
import { Dialog } from './Dialog'
import { cn } from '../../lib/cn'
import { MAX_FILE_SIZE_MB, isRenderableImage, readImageFile, validateImageFile } from '../../lib/image'
import { useAdminLang } from '../../lib/adminI18n'

const DEMO_IMAGES: { label: string; bg: string; emoji?: string }[] = [
  { label: 'logo', bg: '#EAF1FE', emoji: '✦' },
  { label: 'hero-1', bg: '#E7F8F1', emoji: '🏔' },
  { label: 'hero-2', bg: '#FDF3E7', emoji: '🎉' },
  { label: 'packshot', bg: '#FDEBEB', emoji: '🛍' },
  { label: 'brand-1', bg: '#E5E7EB', emoji: '⬡' },
  { label: 'brand-2', bg: '#EDE9FE', emoji: '◆' },
]

export function MediaPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useAdminLang()

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    const validationError = validateImageFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      const dataUrl = await readImageFile(file)
      onChange(dataUrl)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('mediaPicker.loadError'))
    }
  }

  // The browser's default reaction to a dropped file, if nothing calls
  // preventDefault, is to navigate the whole tab to that file — which is
  // what made the picker "disappear". These three handlers make the main
  // preview swatch itself a real drop target, not just a click-to-open button.
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    void handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      {label && <span className="mb-1.5 block text-[12.5px] font-medium text-[var(--pf-ink)]">{label}</span>}
      {/* Wrapper so the remove button is a SIBLING of the preview button, not
          nested inside it — a <button> inside a <button> is invalid HTML and
          triggers a React hydration error. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'flex h-20 w-full items-center justify-center overflow-hidden rounded-[var(--pf-radius-md)] border border-dashed transition-colors',
            dragActive
              ? 'border-[var(--pf-accent)] bg-[var(--pf-accent-soft)]/60'
              : 'border-[var(--pf-border-strong)] bg-[var(--pf-sunken)]/50 hover:border-[var(--pf-accent)] hover:bg-[var(--pf-accent-soft)]/40',
          )}
        >
          {value && isRenderableImage(value) ? (
            <img src={value} alt="" className="h-full w-full object-contain p-1.5" />
          ) : value ? (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-white"
              style={{ background: value.startsWith('#') ? value : 'var(--pf-sunken-2)', color: value.startsWith('#') ? '#fff' : undefined }}
            >
              <ImageIcon className="h-5 w-5 opacity-80" />
              <span className="max-w-full truncate px-2 text-[11px] font-medium opacity-90">{value.replace('#', '')}</span>
            </div>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-[var(--pf-ink-muted)]">
              <Upload className="h-5 w-5" />
              <span className="text-[12px] font-medium">{t('mediaPicker.chooseMedia')}</span>
            </span>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--pf-border-strong)] bg-white text-[var(--pf-ink-faint)] shadow-[var(--pf-shadow-xs)] transition-colors hover:border-[var(--pf-danger)] hover:text-[var(--pf-danger)]"
            aria-label={t('mediaPicker.removeImage')}
            title={t('common.remove')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('mediaPicker.title')}
        description={t('mediaPicker.desc')}
        width={560}
      >
        <div className="space-y-4">
          <label
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--pf-radius-md)] border-2 border-dashed px-4 py-7 text-center transition-colors',
              dragActive
                ? 'border-[var(--pf-accent)] bg-[var(--pf-accent-soft)]/40'
                : 'border-[var(--pf-border-strong)] hover:border-[var(--pf-accent)] hover:bg-[var(--pf-accent-soft)]/30',
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--pf-radius-md)] bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)]">
              <Upload className="h-5 w-5" />
            </span>
            <span className="text-[13.5px] font-semibold text-[var(--pf-ink)]">
              {dragActive ? t('assets.dropHere') : t('mediaPicker.clickOrDrag')}
            </span>
            <span className="text-[12px] text-[var(--pf-ink-muted)]">{t('mediaPicker.fileTypesHint').replace('{max}', String(MAX_FILE_SIZE_MB))}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>

          {error && (
            <p className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
              {error}
            </p>
          )}

          <div>
            <span className="mb-2 block text-[12px] font-medium text-[var(--pf-ink-muted)]">{t('mediaPicker.orChoosePlaceholder')}</span>
            <div className="grid grid-cols-3 gap-3">
              {DEMO_IMAGES.map((img) => (
                <button
                  key={img.label}
                  type="button"
                  onClick={() => {
                    onChange(img.label)
                    setOpen(false)
                  }}
                  className={cn(
                    'group relative overflow-hidden rounded-[var(--pf-radius-sm)] border transition-all hover:border-[var(--pf-accent)]',
                    value === img.label ? 'border-[var(--pf-accent)] ring-2 ring-[var(--pf-accent)]/25' : 'border-[var(--pf-border)]',
                  )}
                >
                  <div className="flex h-20 items-center justify-center text-[28px]" style={{ background: img.bg }}>
                    {img.emoji}
                  </div>
                  <div className="border-t border-[var(--pf-border)] bg-white px-2 py-1.5 text-left font-mono text-[11px] text-[var(--pf-ink-muted)]">
                    {img.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
