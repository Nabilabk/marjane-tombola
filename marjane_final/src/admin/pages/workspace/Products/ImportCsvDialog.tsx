import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { Textarea } from '../../../components/ui/Field'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Basics'
import { lookupArticlesByCodes } from '../../../services/articleCatalogApi'
import type { ArticleRule, CatalogArticle, RuleType } from '../../../services/articleCatalogApi'
import { parseArticlesCsv } from './csv'
import { useAdminLang } from '../../../lib/adminI18n'

interface Preview {
  matched: ArticleRule[]
  missingCodes: string[]
}

export function ImportCsvDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (articles: ArticleRule[]) => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { t } = useAdminLang()

  function reset() {
    setText('')
    setPreview(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFile(file: File) {
    file.text().then(setText)
  }

  async function handlePreview() {
    setError(null)
    setPreview(null)
    let rows
    try {
      rows = parseArticlesCsv(text)
    } catch (e) {
      // parseArticlesCsv() is a plain util with no i18n access — map its one
      // known thrown message here rather than showing it in raw English.
      const raw = e instanceof Error ? e.message : null
      setError(raw === 'CSV needs a "code" column.' ? t('importCsv.errMissingCodeColumn') : raw ?? t('importCsv.errParse'))
      return
    }
    if (rows.length === 0) {
      setError(t('importCsv.errNoRows'))
      return
    }

    setLoading(true)
    try {
      const codes = rows.map((r) => r.code)
      const found = await lookupArticlesByCodes(codes)
      const byCode = new Map<string, CatalogArticle>(found.map((a) => [a.code, a]))
      const matched: ArticleRule[] = []
      const missingCodes: string[] = []
      for (const row of rows) {
        const article = byCode.get(row.code)
        if (!article) {
          missingCodes.push(row.code)
          continue
        }
        matched.push({
          ...article,
          ruleType: (row.ruleType ?? 'quantity') as RuleType,
          threshold: row.threshold ?? 1,
        })
      }
      setPreview({ matched, missingCodes })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('importCsv.errLookup'))
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!preview || preview.matched.length === 0) return
    onImport(preview.matched)
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('importCsv.title')}
      description={t('importCsv.columnsHint')}
      width={560}
    >
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setPreview(null)
          }}
          placeholder={'code,ruleType,threshold\n123456,quantity,2\n789012,price,50'}
          className="min-h-[140px] font-mono text-[12.5px]"
        />

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          <Button variant="secondary" size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>
            {t('importCsv.uploadFile')}
          </Button>
          <Button variant="primary" size="sm" onClick={handlePreview} disabled={!text.trim() || loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('campaigns.preview')}
          </Button>
        </div>

        {error && (
          <p className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
            {error}
          </p>
        )}

        {preview && (
          <div className="space-y-2 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] p-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <CheckCircle2 className="h-4 w-4 text-[var(--pf-success)]" />
              <span className="text-[var(--pf-ink)]">{t('importCsv.willBeAdded').replace('{count}', String(preview.matched.length))}</span>
            </div>
            {preview.missingCodes.length > 0 && (
              <div className="flex items-start gap-2 text-[12.5px]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pf-warning)]" />
                <div className="min-w-0">
                  <span className="text-[var(--pf-ink)]">{t('importCsv.notFoundInCatalog').replace('{count}', String(preview.missingCodes.length))}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {preview.missingCodes.slice(0, 20).map((c) => (
                      <Badge key={c} tone="warning">
                        {c}
                      </Badge>
                    ))}
                    {preview.missingCodes.length > 20 && (
                      <span className="text-[var(--pf-ink-faint)]">{t('importCsv.more').replace('{count}', String(preview.missingCodes.length - 20))}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--pf-border)] pt-4">
          <Button variant="ghost" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!preview || preview.matched.length === 0}>
            {t('importCsv.importCount').replace('{count}', String(preview ? preview.matched.length : 0))}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
