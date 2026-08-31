import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore, isRulesFolder } from '../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { SectionHeading, Badge, EmptyState } from '../../components/ui/Basics'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Field'
import { Search, Upload, Folder, FolderOpen, Image as ImageIcon, Download, Trash2, FileText } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Asset } from '../../lib/types'
import { useAdminLang } from '../../lib/adminI18n'
import { readFileAsDataUrl, readImageFile, validateImageFile } from '../../lib/image'

// Underlying folder values stay English (they're stored on Asset.folder and
// matched by equality) — only the on-screen label is translated.
const FOLDERS = ['Logos', 'Backgrounds', 'Heroes', 'Icons', 'Documents'] as const
const FOLDER_LABEL_KEY: Record<(typeof FOLDERS)[number], string> = {
  Logos: 'assets.folderLogos',
  Backgrounds: 'assets.folderBackgrounds',
  Heroes: 'assets.folderHeroes',
  Icons: 'assets.folderIcons',
  Documents: 'assets.folderDocuments',
}

// An asset whose id starts with 'theme-' isn't independently uploaded — it
// mirrors whatever the Theme Editor (or Settings/Cards/Wheel/Scratch panels)
// has set live as the logo/favicon/hero/brand image (see
// admin/lib/store.ts's computeThemeAssets). Shown with a badge so it reads
// as "what the site is using", not a random extra file.
function isThemeMirroredAsset(a: Asset): boolean {
  return a.id.startsWith('theme-')
}

// A real image (an actual upload — data: URL — or a plain http(s) link) gets
// rendered for real so the tile shows exactly what's live on the site,
// instead of a generic colored icon that looks the same whichever logo is
// set. A demo placeholder value from MediaPicker (e.g. "logo", "#0C2340")
// isn't a fetchable image, so it still falls back to the icon below.
function isRenderableAssetImage(url: string): boolean {
  return url.startsWith('data:image') || /^https?:\/\//.test(url)
}

function AssetThumb({ asset }: { asset: Asset }) {
  if (asset.type === 'document') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--pf-warning-soft)]">
        <FileText className="h-6 w-6 text-[var(--pf-warning)]" />
      </div>
    )
  }
  if (asset.type === 'image' && asset.url && isRenderableAssetImage(asset.url)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <img src={asset.url} alt={asset.name} className="h-full w-full object-contain p-2" />
      </div>
    )
  }
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: asset.folder === 'Logos' ? '#EAF1FE' : asset.folder === 'Heroes' ? '#E7F8F1' : asset.folder === 'Icons' ? '#FDF3E7' : '#E5E7EB' }}>
      {asset.type === 'icon' ? (
        <svg className="h-7 w-7 text-[var(--pf-ink-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
        </svg>
      ) : (
        <ImageIcon className="h-6 w-6 text-[var(--pf-ink-faint)]" />
      )}
    </div>
  )
}

export default function Assets() {
  const { siteId } = useParams()
  const assets = usePlatformStore(useShallow((s) => s.assetsFor(siteId!)))
  const addAsset = usePlatformStore((s) => s.addAsset)
  const deleteAsset = usePlatformStore((s) => s.deleteAsset)
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<string | null>(null)
  const [preview, setPreview] = useState<Asset | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { t } = useAdminLang()

  const allAssets = assets

  const MAX_DOCUMENT_SIZE_MB = 10

  async function handleUploadFile(file: File | undefined) {
    if (!file || !siteId) return
    setUploadError(null)
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    // Only PNG/JPG/SVG/PDF are supported (see the dropzone's own
    // fileTypesHint) — anything else used to fall through to the generic
    // `isImage ? 'Heroes' : 'Documents'` guess below, which meant dropping
    // an unrelated file (a .docx, .csv, anything) while on the "All" tab
    // silently landed it in the single-slot "Documents" folder and replaced
    // the site's live tombola règlement PDF with no confirmation.
    if (!isImage && !isPdf) {
      setUploadError(t('assets.unsupportedType'))
      return
    }
    const type: Asset['type'] = isPdf ? 'document' : file.type.includes('svg') ? 'icon' : 'image'
    const guessedFolder = folder ?? (isImage ? 'Heroes' : 'Documents')

    try {
      // Keep the actual file bytes so "Download" later has something real to
      // hand back — images go through the same shrink-and-encode path as
      // MediaPicker so they don't bloat storage; other files (PDFs, etc.)
      // are read as-is.
      let dataUrl: string
      if (isImage) {
        const validationError = validateImageFile(file)
        if (validationError) {
          setUploadError(validationError)
          return
        }
        dataUrl = await readImageFile(file)
      } else {
        if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
          setUploadError(`That file is too large — please pick one under ${MAX_DOCUMENT_SIZE_MB} MB.`)
          return
        }
        dataUrl = await readFileAsDataUrl(file)
      }
      addAsset(siteId, file.name, guessedFolder, type, Math.max(1, Math.round(file.size / 1024)), dataUrl)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t('mediaPicker.loadError'))
    }
  }

  function downloadAsset(asset: Asset) {
    if (!asset.url) {
      alert(t('assets.noFileData'))
      return
    }
    const link = document.createElement('a')
    link.href = asset.url
    link.download = asset.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Without preventDefault, a dropped file falls through to the browser's
  // default "navigate to this file" behavior, which blanks the whole app.
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
    void handleUploadFile(e.dataTransfer.files?.[0])
  }

  const filtered = useMemo(
    () =>
      allAssets.filter(
        (a) =>
          (!folder || a.folder === folder) &&
          a.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [allAssets, query, folder],
  )

  // Deleting a theme-mirrored asset (the live logo/favicon/...) or the
  // règlement PDF doesn't just remove a tile here — it clears the actual
  // site setting (see admin/lib/store.ts's deleteAsset), so the confirm
  // dialog says so instead of reading like an ordinary file deletion.
  function confirmDeleteMessage(a: Asset): string {
    const base = `${t('assets.deleteConfirmPrefix')} "${a.name}" ?`
    if (isThemeMirroredAsset(a)) return `${base} ${t('assets.deleteInUseWarning')}`
    if (isRulesFolder(a.folder)) return `${base} ${t('assets.deleteRulesWarning')}`
    return base
  }

  return (
    <div className="pf-fade-in">
      <SectionHeading
        eyebrow={t('assets.eyebrow')}
        title={t('assets.title')}
        description={t('assets.desc')}
        action={
          <label className="inline-flex cursor-pointer">
            <Button variant="primary" icon={<Upload className="h-3.5 w-3.5" />} type="button" onClick={() => {}}>
              {t('assets.upload')}
            </Button>
            <input type="file" className="hidden" onChange={(e) => {
              void handleUploadFile(e.target.files?.[0])
              e.target.value = ''
            }} />
          </label>
        }
      />

      <div className="mt-6 flex flex-wrap gap-4">
        {/* Folders sidebar */}
        <aside className="w-full shrink-0 lg:w-[200px]">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pf-ink-faint)]" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('assets.searchPlaceholder')} className="pl-8" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
            <button
              type="button"
              onClick={() => setFolder(null)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-[var(--pf-radius-sm)] px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors',
                folder === null
                  ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
                  : 'text-[var(--pf-ink-muted)] hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]',
              )}
            >
              <FolderOpen className="h-4 w-4" /> {t('assets.allAssets')}
            </button>
            {FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFolder(f)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-[var(--pf-radius-sm)] px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors',
                  folder === f
                    ? 'bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]'
                    : 'text-[var(--pf-ink-muted)] hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-ink)]',
                )}
              >
                <Folder className="h-4 w-4" /> {t(FOLDER_LABEL_KEY[f])}
              </button>
            ))}
          </div>
        </aside>

        {/* Gallery */}
        <div className="min-w-0 flex-1">
          {/* Upload dropzone */}
          <label
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'mb-4 flex cursor-pointer items-center justify-center gap-3 rounded-[var(--pf-radius-md)] border-2 border-dashed px-4 py-7 text-center transition-colors',
              dragActive
                ? 'border-[var(--pf-accent)] bg-[var(--pf-accent-soft)]/40'
                : 'border-[var(--pf-border-strong)] bg-[var(--pf-surface)] hover:border-[var(--pf-accent)] hover:bg-[var(--pf-accent-soft)]/30',
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--pf-radius-md)] bg-[var(--pf-sunken)] text-[var(--pf-ink-muted)]">
              <Upload className="h-5 w-5" />
            </span>
<span className="text-left">
              <span className="block text-[13.5px] font-semibold text-[var(--pf-ink)]">
                {dragActive ? t('assets.dropHere') : t('assets.dropOrBrowse')}
              </span>
              <span className="mt-0.5 block text-[12px] text-[var(--pf-ink-muted)]">
                {t('assets.fileTypesHint')}
              </span>
            </span>
            <input type="file" className="hidden" onChange={(e) => {
              void handleUploadFile(e.target.files?.[0])
              e.target.value = ''
            }} />
          </label>

          {folder === 'Documents' && (
            <p className="mb-4 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-[var(--pf-sunken)]/60 px-3 py-2 text-[12px] text-[var(--pf-ink-muted)]">
              {t('assets.documentsHint')}
            </p>
          )}

          {uploadError && (
            <p className="mb-4 rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
              {uploadError}
            </p>
          )}

          {filtered.length === 0 ? (
            <EmptyState title={t('assets.notFoundTitle')} description={t('assets.notFoundDesc')} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreview(a)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setPreview(a)
                    }
                  }}
                  className="group cursor-pointer overflow-hidden rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)] text-left shadow-[var(--pf-shadow-xs)] transition-all hover:-translate-y-0.5 hover:border-[var(--pf-accent)] hover:shadow-[var(--pf-shadow-md)] focus:outline-none focus:ring-4 focus:ring-[var(--pf-accent)]/12"
                >
                  <div className="relative h-24">
                    <AssetThumb asset={a} />
                    {isThemeMirroredAsset(a) && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--pf-accent)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.04em] text-white shadow-[var(--pf-shadow-xs)]">
                        {t('assets.inUse')}
                      </span>
                    )}
<div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#17181c]/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadAsset(a)
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--pf-ink)]"
                        aria-label={t('assets.download')}
                        title={t('assets.download')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(confirmDeleteMessage(a))) {
                            deleteAsset(siteId!, a.id)
                            if (preview?.id === a.id) setPreview(null)
                          }
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--pf-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="truncate text-[12px] font-medium text-[var(--pf-ink)]">{a.name}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-[10.5px] text-[var(--pf-ink-faint)] tabular">{a.sizeKb} KB</span>
                      <Badge tone="neutral">{t(FOLDER_LABEL_KEY[a.folder as (typeof FOLDERS)[number]] ?? a.folder)}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        description={t('assets.info')}
        width={420}
      >
        {preview && (
          <div>
            <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-[var(--pf-radius-md)] border border-[var(--pf-border)]">
              <AssetThumb asset={preview} />
            </div>
            <div className="space-y-2.5">
              {[
                { label: t('common.type'), value: preview.type },
                { label: t('assets.folder'), value: t(FOLDER_LABEL_KEY[preview.folder as (typeof FOLDERS)[number]] ?? preview.folder) },
                { label: t('assets.size'), value: `${preview.sizeKb} KB` },
                { label: t('assets.uploaded'), value: new Date(preview.uploadedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-[var(--pf-radius-sm)] bg-[var(--pf-sunken)]/60 px-3 py-2">
                  <span className="text-[12px] font-medium text-[var(--pf-ink-muted)]">{row.label}</span>
                  <span className="font-mono text-[12px] capitalize text-[var(--pf-ink)]">{row.value}</span>
                </div>
              ))}
            </div>
<div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadAsset(preview)}>
                {t('assets.download')}
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  if (confirm(confirmDeleteMessage(preview))) {
                    deleteAsset(siteId!, preview.id)
                    setPreview(null)
                  }
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

