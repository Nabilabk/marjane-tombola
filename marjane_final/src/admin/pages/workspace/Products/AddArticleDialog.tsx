import { useEffect, useState } from 'react'
import { Search, Loader2, Package, Check, ChevronLeft, ChevronRight, X, SlidersHorizontal } from 'lucide-react'
import { Dialog } from '../../../components/ui/Dialog'
import { Select, Field } from '../../../components/ui/Field'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Basics'
import { cn } from '../../../lib/cn'
import {
  fetchAllMatchingArticles,
  fetchBrands,
  fetchFournisseurs,
  fetchRayons,
  searchArticles,
} from '../../../services/articleCatalogApi'
import type { CatalogArticle } from '../../../services/articleCatalogApi'
import { useAdminLang } from '../../../lib/adminI18n'

const PAGE_SIZE = 30

export function AddArticleDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (articles: CatalogArticle[]) => void
}) {
  const [brands, setBrands] = useState<string[]>([])
  const [fournisseurs, setFournisseurs] = useState<string[]>([])
  const [rayons, setRayons] = useState<string[]>([])
  const [brand, setBrand] = useState('')
  const [fournisseur, setFournisseur] = useState('')
  const [rayon, setRayon] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<CatalogArticle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Map<string, CatalogArticle>>(new Map())
  const [selectAllLoading, setSelectAllLoading] = useState(false)
  const [selectAllNote, setSelectAllNote] = useState<string | null>(null)
  const { t } = useAdminLang()

  useEffect(() => {
    if (!open) return
    fetchBrands().then(setBrands).catch(() => {})
    fetchFournisseurs().then(setFournisseurs).catch(() => {})
    fetchRayons().then(setRayons).catch(() => {})
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setPage(1)
    setSelectAllNote(null)
  }, [brand, fournisseur, rayon, debouncedQuery])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    // A query that's all digits (4+) reads as an EAN/barcode scan or type-in
    // rather than a name search — route it to the gencode filter instead of
    // matching it against article libellés (where it would never hit).
    const trimmed = debouncedQuery.trim()
    const isEan = /^\d{4,}$/.test(trimmed)
    searchArticles({
      brand: brand || undefined,
      fournisseur: fournisseur || undefined,
      rayon: rayon || undefined,
      q: isEan ? undefined : trimmed || undefined,
      gencode: isEan ? trimmed : undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((r) => {
        if (cancelled) return
        setResults(r.items)
        setTotal(r.total)
      })
      .catch(() => {
        if (cancelled) return
        setResults([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, brand, fournisseur, rayon, debouncedQuery, page])

  useEffect(() => {
    if (!open) {
      setSelected(new Map())
      setQuery('')
      setDebouncedQuery('')
      setBrand('')
      setFournisseur('')
      setRayon('')
      setPage(1)
      setSelectAllNote(null)
    }
  }, [open])

  function toggle(article: CatalogArticle) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(article.code)) next.delete(article.code)
      else next.set(article.code, article)
      return next
    })
  }

  function handleAdd() {
    onAdd(Array.from(selected.values()))
    onClose()
  }

  function resetFilters() {
    setBrand('')
    setFournisseur('')
    setRayon('')
    setQuery('')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilter = Boolean(brand || fournisseur || rayon || debouncedQuery.trim())
  const selectedList = Array.from(selected.values())

  // "Select all matching" fetches the WHOLE filtered set in one request —
  // one click has to add e.g. every article of a fournisseur even though
  // it spans many pages of the on-screen results list, not just page 1.
  async function handleSelectAllMatching() {
    setSelectAllLoading(true)
    setSelectAllNote(null)
    try {
      const trimmed = debouncedQuery.trim()
      const isEan = /^\d{4,}$/.test(trimmed)
      const { items, total: matchedTotal, truncated } = await fetchAllMatchingArticles({
        brand: brand || undefined,
        fournisseur: fournisseur || undefined,
        rayon: rayon || undefined,
        q: isEan ? undefined : trimmed || undefined,
        gencode: isEan ? trimmed : undefined,
      })
      setSelected((prev) => {
        const next = new Map(prev)
        for (const a of items) next.set(a.code, a)
        return next
      })
      setSelectAllNote(
        truncated
          ? t('addArticle.partialSelectNote').replace('{shown}', items.length.toLocaleString('fr-FR')).replace('{total}', matchedTotal.toLocaleString('fr-FR'))
          : t('addArticle.fullSelectNote').replace('{count}', items.length.toLocaleString('fr-FR')),
      )
    } catch {
      setSelectAllNote(t('addArticle.selectAllError'))
    } finally {
      setSelectAllLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('addArticle.title')}
      description={t('addArticle.desc')}
      width={720}
    >
      <div className="space-y-4">
        <SearchInput value={query} onChange={setQuery} placeholder={t('addArticle.searchPlaceholder')} />

        <div className="rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-sunken)]/50 p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--pf-ink-faint)]">
              <SlidersHorizontal className="h-3 w-3" />
              Filtres
            </span>
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11.5px] font-medium text-[var(--pf-accent)] hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('products.rayon')}>
              <Select value={rayon} onChange={(e) => setRayon(e.target.value)}>
                <option value="">{t('addArticle.allRayons')}</option>
                {rayons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('products.brand')}>
              <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">{t('addArticle.allBrands')}</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('products.fournisseur')}>
              <Select value={fournisseur} onChange={(e) => setFournisseur(e.target.value)}>
                <option value="">{t('addArticle.allFournisseurs')}</option>
                {fournisseurs.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {hasFilter && total > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--pf-radius-sm)] border border-[var(--pf-accent)]/25 bg-[var(--pf-accent-soft)] px-3 py-2">
            <Button size="xs" variant="secondary" onClick={handleSelectAllMatching} disabled={selectAllLoading}>
              {selectAllLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                `Tout sélectionner (${total.toLocaleString('fr-FR')})`
              )}
            </Button>
            {selected.size > 0 && (
              <Button size="xs" variant="ghost" onClick={() => setSelected(new Map())}>
                Effacer la sélection
              </Button>
            )}
            {selectAllNote && (
              <span className="text-[11.5px] text-[var(--pf-accent)]">{selectAllNote}</span>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-xs)]">
          <div className="flex items-center justify-between border-b border-[var(--pf-border)] bg-[var(--pf-sunken)] px-3.5 py-2">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--pf-ink-faint)]">
              Résultats
            </span>
            <span className="font-mono text-[11.5px] tabular text-[var(--pf-ink-faint)]">
              {total.toLocaleString('fr-FR')}
            </span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <ul className="divide-y divide-[var(--pf-border)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-3.5 py-3">
                    <div className="pf-skeleton h-[18px] w-[18px] shrink-0 rounded-[5px]" />
                    <div className="pf-skeleton h-9 w-9 shrink-0 rounded-[var(--pf-radius-sm)]" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="pf-skeleton h-3.5 w-2/5" />
                      <div className="pf-skeleton h-3 w-1/4" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : results.length === 0 && !hasFilter ? (
              <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--pf-sunken)] text-[var(--pf-ink-faint)]">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-[13.5px] font-medium text-[var(--pf-ink)]">
                  Cherchez parmi {total.toLocaleString('fr-FR')} articles
                </p>
                <p className="text-[12px] text-[var(--pf-ink-faint)]">
                  Tapez un nom, un EAN, ou choisissez un rayon/marque/fournisseur ci-dessus.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--pf-sunken)] text-[var(--pf-ink-faint)]">
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-[13.5px] font-medium text-[var(--pf-ink)]">Aucun article ne correspond</p>
                <p className="text-[12px] text-[var(--pf-ink-faint)]">Essayez un autre filtre ou une autre recherche.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--pf-border)]">
                {results.map((a) => {
                  const isSelected = selected.has(a.code)
                  return (
                    <li key={a.code}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 border-l-2 px-3.5 py-3 transition-colors',
                          isSelected
                            ? 'border-l-[var(--pf-accent)] bg-[var(--pf-accent-soft)]'
                            : 'border-l-transparent hover:bg-[var(--pf-sunken)]/60',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(a)}
                          className="peer sr-only"
                        />
                        <span
                          className={cn(
                            'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                            isSelected
                              ? 'border-[var(--pf-accent)] bg-[var(--pf-accent)] text-white'
                              : 'border-[var(--pf-border-strong)] bg-white',
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>

                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--pf-radius-sm)]',
                            isSelected
                              ? 'bg-[var(--pf-accent)] text-white'
                              : 'bg-[var(--pf-sunken)] text-[var(--pf-ink-faint)]',
                          )}
                        >
                          <Package className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[var(--pf-ink)]">{a.libelle}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {a.rayon && <Badge tone="neutral">{a.rayon}</Badge>}
                            {a.marq && <Badge tone="accent">{a.marq}</Badge>}
                            {a.fournisseur && (
                              <span className="text-[11px] text-[var(--pf-ink-faint)]">{a.fournisseur}</span>
                            )}
                            {a.gencode && (
                              <span className="font-mono text-[10.5px] text-[var(--pf-ink-faint)]">
                                EAN {a.gencode}
                              </span>
                            )}
                          </div>
                        </div>

                        {a.price != null && (
                          <span className="shrink-0 font-mono text-[12.5px] tabular text-[var(--pf-ink-muted)]">
                            {a.price.toFixed(2)} MAD
                          </span>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--pf-border)] px-3.5 py-2">
              <span className="text-[11.5px] text-[var(--pf-ink-faint)]">
                Page {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] disabled:opacity-40"
                  aria-label={t('common.previousPage')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] disabled:opacity-40"
                  aria-label={t('common.nextPage')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedList.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--pf-radius-sm)] bg-[var(--pf-sunken)]/60 px-3 py-2.5">
            {selectedList.slice(0, 8).map((a) => (
              <span
                key={a.code}
                className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-[var(--pf-border-strong)] bg-white py-[3px] pl-2.5 pr-1.5 text-[11.5px] font-medium text-[var(--pf-ink)]"
              >
                <span className="truncate">{a.libelle}</span>
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[var(--pf-ink-faint)] hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-danger)]"
                  aria-label={`${t('common.remove')} ${a.libelle}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {selectedList.length > 8 && (
              <span className="text-[11.5px] text-[var(--pf-ink-faint)]">+{selectedList.length - 8} de plus</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--pf-border)] pt-4">
          <span className="text-[12.5px] text-[var(--pf-ink-muted)]">{selected.size} {t('products.selected')}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={selected.size === 0}>
              {t('addArticle.addCount').replace('{count}', String(selected.size))}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
