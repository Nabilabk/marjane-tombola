import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/Basics'
import { saveProductRules } from '../../../services/articleCatalogApi'
import type { ProductRules } from '../../../services/articleCatalogApi'
import { useAdminLang } from '../../../lib/adminI18n'

interface Target {
  id: string
  name: string
  slug?: string
}

type CopyState = 'idle' | 'pending' | 'ok' | 'error'

export function CopyRulesDialog({
  open,
  onClose,
  rules,
  targets,
}: {
  open: boolean
  onClose: () => void
  rules: ProductRules
  /** Every other site/campaign the admin could copy these rules to. */
  targets: Target[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, CopyState>>({})
  const [running, setRunning] = useState(false)
  const { t } = useAdminLang()

  useEffect(() => {
    if (!open) {
      setSelected(new Set())
      setResults({})
      setRunning(false)
    }
  }, [open])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCopy() {
    setRunning(true)
    const chosen = targets.filter((t) => selected.has(t.id))
    const next: Record<string, CopyState> = {}
    for (const t of chosen) next[t.id] = 'pending'
    setResults(next)

    await Promise.all(
      chosen.map(async (t) => {
        if (!t.slug) {
          setResults((r) => ({ ...r, [t.id]: 'error' }))
          return
        }
        try {
          await saveProductRules(t.slug, rules)
          setResults((r) => ({ ...r, [t.id]: 'ok' }))
        } catch {
          setResults((r) => ({ ...r, [t.id]: 'error' }))
        }
      }),
    )
    setRunning(false)
  }

  const doneCount = Object.keys(results).length > 0
  const canCopy = selected.size > 0 && !running

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('copyRules.title')}
      description={t('copyRules.desc').replace('{count}', String(rules.articles.length))}
      width={480}
    >
      <div className="space-y-4">
        {targets.length === 0 ? (
          <EmptyState title={t('copyRules.noOtherSites')} description={t('copyRules.noOtherSitesDesc')} />
        ) : (
          <ul className="max-h-[280px] divide-y divide-[var(--pf-border)] overflow-y-auto rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)]">
            {targets.map((t) => {
              const state = results[t.id]
              return (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[var(--pf-sunken)]/60">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      disabled={running}
                      onChange={() => toggle(t.id)}
                      className="h-4 w-4 rounded border-[var(--pf-border-strong)]"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--pf-ink)]">{t.name}</span>
                    {state === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-[var(--pf-ink-faint)]" />}
                    {state === 'ok' && <CheckCircle2 className="h-4 w-4 text-[var(--pf-success)]" />}
                    {state === 'error' && <XCircle className="h-4 w-4 text-[var(--pf-danger)]" />}
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--pf-border)] pt-4">
          <Button variant="ghost" onClick={onClose}>
            {doneCount ? t('common.close') : t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleCopy} loading={running} disabled={!canCopy}>
            {t('copyRules.copyToSites').replace('{count}', String(selected.size))}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
