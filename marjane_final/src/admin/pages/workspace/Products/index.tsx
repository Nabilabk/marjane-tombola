import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore as useCampaignStore } from '../../../../platform/store'
import { SectionHeading, Badge, EmptyState, Card } from '../../../components/ui/Basics'
import { Button } from '../../../components/ui/Button'
import { DataTable } from '../../../components/ui/DataTable'
import type { Column } from '../../../components/ui/DataTable'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Select } from '../../../components/ui/Field'
import { Package, Plus, Upload, Download, Copy, X, Layers } from 'lucide-react'
import {
  emptyProductRules,
  getProductRules,
  saveProductRules,
} from '../../../services/articleCatalogApi'
import type { ArticleRule, ProductRules, RuleType } from '../../../services/articleCatalogApi'
import { StatsBar } from './StatsBar'
import { AddArticleDialog } from './AddArticleDialog'
import { BulkRuleDialog } from './BulkRuleDialog'
import { ImportCsvDialog } from './ImportCsvDialog'
import { CopyRulesDialog } from './CopyRulesDialog'
import { articlesToCsv, downloadCsv } from './csv'
import { useAdminLang } from '../../../lib/adminI18n'

const UNCATEGORIZED = '__uncategorized__'

/** Keeps minMatches sane as the selected-articles list shrinks/grows —
 * "at least 3 of these articles" stops making sense once only 2 remain. */
function clampMinMatches(articleCount: number, minMatches: number) {
  return Math.min(Math.max(1, minMatches), Math.max(1, articleCount))
}

/** Reads the two independent on/off switches out of the combined `mode`
 * enum ('both' means both are on). */
function modeParts(mode: ProductRules['mode']) {
  return { perArticleOn: mode === 'per_article' || mode === 'both', combinedOn: mode === 'combined' || mode === 'both' }
}

export default function Products() {
  // This page is routed at `site/:siteId/products` (AdminApp.tsx) but used
  // to never actually read `siteId` — every site's Products tab silently
  // hit the same backend campaign, so configuring one site's eligible
  // articles overwrote another's. `slug` is what scopes the backend calls
  // to THIS site's campaign (see backend/app.py's `_get_or_create_campaign_by_slug`).
  const { siteId } = useParams()
  const campaigns = useCampaignStore((s) => s.campaigns)
  const slug = campaigns.find((c) => c.id === siteId)?.slug

  const [rules, setRules] = useState<ProductRules>(emptyProductRules())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [bulkRuleOpen, setBulkRuleOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [rayonFilter, setRayonFilter] = useState<string | null>(null)
  const [groupByRayon, setGroupByRayon] = useState(false)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const { t } = useAdminLang()

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    getProductRules(slug)
      .then((r) => {
        if (!cancelled) setRules(r)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('products.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  function setModePart(part: 'per_article' | 'combined', on: boolean) {
    setRules((r) => {
      const cur = modeParts(r.mode)
      const nextPer = part === 'per_article' ? on : cur.perArticleOn
      const nextComb = part === 'combined' ? on : cur.combinedOn
      if (!nextPer && !nextComb) return r // at least one must stay enabled
      const mode: ProductRules['mode'] = nextPer && nextComb ? 'both' : nextPer ? 'per_article' : 'combined'
      return {
        ...r,
        mode,
        combinedRule: nextComb ? (r.combinedRule ?? { ruleType: 'price', threshold: 1 }) : r.combinedRule,
        minMatches: clampMinMatches(r.articles.length, r.minMatches),
      }
    })
  }

  function updateArticle(code: string, patch: Partial<ArticleRule>) {
    setRules((r) => ({
      ...r,
      articles: r.articles.map((a) => (a.code === code ? { ...a, ...patch } : a)),
    }))
  }

  function removeArticle(code: string) {
    setRules((r) => {
      const articles = r.articles.filter((a) => a.code !== code)
      return { ...r, articles, minMatches: clampMinMatches(articles.length, r.minMatches) }
    })
    setSelectedCodes((s) => {
      if (!s.has(code)) return s
      const next = new Set(s)
      next.delete(code)
      return next
    })
  }

  function addArticles(picked: ArticleRule[]) {
    setRules((r) => {
      const existing = new Set(r.articles.map((a) => a.code))
      const additions: ArticleRule[] = picked
        .filter((a) => !existing.has(a.code))
        .map((a) => ({ ...a, ruleType: (a.ruleType ?? 'quantity') as RuleType, threshold: a.threshold ?? 1 }))
      return { ...r, articles: [...r.articles, ...additions] }
    })
  }

  function bulkSetRule(ruleType: RuleType, threshold: number) {
    setRules((r) => ({
      ...r,
      articles: r.articles.map((a) => (selectedCodes.has(a.code) ? { ...a, ruleType, threshold } : a)),
    }))
    setSelectedCodes(new Set())
  }

  function bulkRemove() {
    setRules((r) => {
      const articles = r.articles.filter((a) => !selectedCodes.has(a.code))
      return { ...r, articles, minMatches: clampMinMatches(articles.length, r.minMatches) }
    })
    setSelectedCodes(new Set())
  }

  function toggleSelect(code: string) {
    setSelectedCodes((s) => {
      const next = new Set(s)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const { perArticleOn, combinedOn } = modeParts(rules.mode)

  const validationError = useMemo(() => {
    if (rules.articles.length === 0) return t('products.errAddOne')
    if (perArticleOn) {
      if (rules.articles.some((a) => !a.ruleType || !a.threshold || a.threshold <= 0)) {
        return t('products.errRuleAndThreshold')
      }
      if (rules.minMatches < 1 || rules.minMatches > rules.articles.length) {
        return t('products.errMinMatchesRange').replace('{max}', String(rules.articles.length))
      }
    }
    if (combinedOn && (!rules.combinedRule || rules.combinedRule.threshold <= 0)) {
      return t('products.errPriceRule')
    }
    return null
  }, [rules, t])

  async function handleSave() {
    if (validationError) {
      setSaveError(validationError)
      return
    }
    if (!slug) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const result = await saveProductRules(slug, rules)
      setRules(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('products.saveError'))
    } finally {
      setSaving(false)
    }
  }

  function handleExport() {
    downloadCsv(`${slug ?? 'campaign'}-product-rules.csv`, articlesToCsv(rules.articles))
  }

  // Rayon chips are derived from the currently-selected articles, not the
  // whole catalog — this is a filter over what's already added, not another
  // catalog search.
  const rayonChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of rules.articles) {
      const key = a.rayon ?? UNCATEGORIZED
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rules.articles])

  const filteredArticles = useMemo(() => {
    let list = rules.articles
    if (rayonFilter) list = list.filter((a) => (a.rayon ?? UNCATEGORIZED) === rayonFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (a) =>
          a.libelle.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          (a.marq ?? '').toLowerCase().includes(q) ||
          (a.fournisseur ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [rules.articles, rayonFilter, search])

  const allFilteredSelected = filteredArticles.length > 0 && filteredArticles.every((a) => selectedCodes.has(a.code))

  function toggleSelectAllFiltered() {
    setSelectedCodes((s) => {
      const next = new Set(s)
      if (allFilteredSelected) {
        for (const a of filteredArticles) next.delete(a.code)
      } else {
        for (const a of filteredArticles) next.add(a.code)
      }
      return next
    })
  }

  const otherCampaigns = campaigns.filter((c) => c.id !== siteId).map((c) => ({ id: c.id, name: c.name, slug: c.slug }))

  const ruleColumns: Column<ArticleRule>[] =
    perArticleOn
      ? [
          {
            key: 'ruleType',
            label: t('products.rule'),
            render: (a: ArticleRule) => (
              <Select
                value={a.ruleType ?? 'quantity'}
                onChange={(e) => updateArticle(a.code, { ruleType: e.target.value as RuleType })}
                className="w-32"
              >
                <option value="quantity">{t('products.quantityGte')}</option>
                <option value="price">{t('products.spendGte')}</option>
              </Select>
            ),
          },
          {
            key: 'threshold',
            label: t('products.threshold'),
            render: (a: ArticleRule) => (
              <input
                type="number"
                min={a.ruleType === 'price' ? 0 : 1}
                step={a.ruleType === 'price' ? 0.5 : 1}
                value={a.threshold ?? 1}
                onChange={(e) => updateArticle(a.code, { threshold: Number(e.target.value) })}
                className="h-9 w-24 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white px-2.5 text-[13px] text-[var(--pf-ink)] shadow-[var(--pf-shadow-xs)] focus:outline-none focus:border-[var(--pf-accent)] focus:ring-4 focus:ring-[var(--pf-accent)]/12"
              />
            ),
          },
        ]
      : []

  const columns: Column<ArticleRule>[] = [
    {
      key: 'select',
      label: '',
      headerClassName: 'w-9',
      render: (a) => (
        <input
          type="checkbox"
          checked={selectedCodes.has(a.code)}
          onChange={() => toggleSelect(a.code)}
          className="h-4 w-4 rounded border-[var(--pf-border-strong)]"
        />
      ),
    },
    {
      key: 'libelle',
      label: t('products.article'),
      sortable: true,
      sortValue: (a) => a.libelle,
      render: (a) => (
        <div>
          <div className="font-medium text-[var(--pf-ink)]">{a.libelle}</div>
          <div className="font-mono text-[11px] text-[var(--pf-ink-faint)]">{a.code}</div>
        </div>
      ),
    },
    {
      key: 'rayon',
      label: t('products.rayon'),
      sortable: true,
      sortValue: (a) => a.rayon ?? '',
      render: (a) =>
        a.rayon ? <Badge tone="neutral">{a.rayon}</Badge> : <span className="text-[var(--pf-ink-faint)]">—</span>,
    },
    {
      key: 'marq',
      label: t('products.brand'),
      sortable: true,
      sortValue: (a) => a.marq ?? '',
      render: (a) =>
        a.marq ? <Badge tone="accent">{a.marq}</Badge> : <span className="text-[var(--pf-ink-faint)]">—</span>,
    },
    {
      key: 'fournisseur',
      label: t('products.fournisseur'),
      sortable: true,
      sortValue: (a) => a.fournisseur ?? '',
      render: (a) => <span className="text-[var(--pf-ink-muted)]">{a.fournisseur ?? '—'}</span>,
    },
    {
      key: 'price',
      label: t('products.catalogPrice'),
      sortable: true,
      sortValue: (a) => a.price ?? 0,
      render: (a) => (
        <span className="font-mono text-[13px] tabular text-[var(--pf-ink)]">
          {a.price != null ? `${a.price.toFixed(2)} MAD` : '—'}
        </span>
      ),
    },
    ...ruleColumns,
    {
      key: 'actions',
      label: '',
      render: (a) => (
        <button
          type="button"
          onClick={() => removeArticle(a.code)}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-faint)] transition-colors hover:bg-[var(--pf-sunken)] hover:text-[var(--pf-danger)]"
          aria-label={`${t('common.remove')} ${a.libelle}`}
        >
          <X className="h-4 w-4" />
        </button>
      ),
    },
  ]

  const grouped = useMemo(() => {
    if (!groupByRayon) return null
    const map = new Map<string, ArticleRule[]>()
    for (const a of filteredArticles) {
      const key = a.rayon ?? t('products.uncategorized')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [groupByRayon, filteredArticles, t])

  return (
    <div className="pf-fade-in space-y-5">
      <SectionHeading
        eyebrow={t('products.eyebrow')}
        title={t('products.eligibleArticles')}
        description={t('products.eligibleArticlesDesc')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>
              {t('products.importCsv')}
            </Button>
            <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
              {t('products.addArticle')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy className="h-3.5 w-3.5" />}
              onClick={() => setCopyOpen(true)}
              disabled={rules.articles.length === 0}
            >
              {t('products.copyTo')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExport}
              disabled={rules.articles.length === 0}
            >
              {t('products.exportCsv')}
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
              {saved ? t('prizes.saved') : t('products.saveRules')}
            </Button>
          </div>
        }
      />

      {loadError && (
        <p className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
          {loadError}
        </p>
      )}
      {saveError && (
        <p className="rounded-[var(--pf-radius-sm)] border border-[var(--pf-danger)]/30 bg-[var(--pf-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--pf-danger)]">
          {saveError}
        </p>
      )}

      <StatsBar articles={rules.articles} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={perArticleOn ? 'primary' : 'outline'}
              onClick={() => setModePart('per_article', !perArticleOn)}
              aria-pressed={perArticleOn}
            >
              {t('products.perArticleThresholds')}
            </Button>
            <Button
              size="sm"
              variant={combinedOn ? 'primary' : 'outline'}
              onClick={() => setModePart('combined', !combinedOn)}
              aria-pressed={combinedOn}
            >
              {t('products.priceThreshold')}
            </Button>
          </div>

          <Button
            size="sm"
            variant={groupByRayon ? 'primary' : 'outline'}
            icon={<Layers className="h-3.5 w-3.5" />}
            onClick={() => setGroupByRayon((v) => !v)}
            className="ml-auto"
          >
            {t('products.groupByRayon')}
          </Button>
        </div>

        {(perArticleOn || combinedOn) && (
          <div className="mt-3 flex flex-col gap-2 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border)] bg-[var(--pf-sunken)]/40 p-3">
            {perArticleOn && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--pf-ink-muted)]">
                <span>{t('products.atLeast')}</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, rules.articles.length)}
                  value={rules.minMatches}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      minMatches: clampMinMatches(r.articles.length, Number(e.target.value)),
                    }))
                  }
                  className="h-9 w-16 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white px-2.5 text-[13px] text-[var(--pf-ink)] shadow-[var(--pf-shadow-xs)] focus:outline-none focus:border-[var(--pf-accent)] focus:ring-4 focus:ring-[var(--pf-accent)]/12"
                />
                <span>
                  article{rules.minMatches === 1 ? '' : 's'} différent{rules.minMatches === 1 ? '' : 's'} trouvé
                  {rules.minMatches === 1 ? '' : 's'} sur le ticket (sur {rules.articles.length} sélectionné
                  {rules.articles.length === 1 ? '' : 's'})
                </span>
              </div>
            )}

            {perArticleOn && combinedOn && (
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--pf-accent)]">
                <span className="h-px flex-1 bg-[var(--pf-border)]" />
                {t('products.andBothActive')}
                <span className="h-px flex-1 bg-[var(--pf-border)]" />
              </div>
            )}

            {combinedOn && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--pf-ink-muted)]">
                <span>
                  {t(rules.combinedRule?.ruleType === 'quantity' ? 'products.totalQuantityGte' : 'products.totalSpendGte')}
                </span>
                <input
                  type="number"
                  min={rules.combinedRule?.ruleType === 'quantity' ? 1 : 0}
                  step={rules.combinedRule?.ruleType === 'quantity' ? 1 : 0.5}
                  value={rules.combinedRule?.threshold ?? 1}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      // Keep whatever ruleType the combined rule already had — only the
                      // threshold number is editable here. Forcing this to 'price' used
                      // to silently convert a pre-existing quantity-based combined rule
                      // ("qualifies at N items") into a spend-based one ("qualifies at
                      // N MAD") the moment its threshold was tweaked, with no admin
                      // confirmation. New combined rules still default to 'price'.
                      combinedRule: { ruleType: r.combinedRule?.ruleType ?? 'price', threshold: Number(e.target.value) },
                    }))
                  }
                  className="h-9 w-28 rounded-[var(--pf-radius-sm)] border border-[var(--pf-border-strong)] bg-white px-2.5 text-[13px] text-[var(--pf-ink)] shadow-[var(--pf-shadow-xs)] focus:outline-none focus:border-[var(--pf-accent)] focus:ring-4 focus:ring-[var(--pf-accent)]/12"
                />
                {rules.combinedRule?.ruleType !== 'quantity' && <span>MAD</span>}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder={t('products.searchSelectedPlaceholder')} className="max-w-xs" />
          {rayonChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {rayonChips.map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRayonFilter((cur) => (cur === key ? null : key))}
                  className={
                    rayonFilter === key
                      ? 'rounded-full bg-[var(--pf-accent)] px-2.5 py-1 text-[11.5px] font-medium text-white'
                      : 'rounded-full bg-[var(--pf-sunken)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--pf-ink-muted)] hover:bg-[var(--pf-border)]'
                  }
                >
                  {key === UNCATEGORIZED ? t('products.uncategorized') : key} · {count}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
            {filteredArticles.length} {t('ticketsTab.of')} {rules.articles.length} {t('sidebar.products').toLowerCase()}
          </span>
        </div>

        {rules.articles.length > 0 && (
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[12px] text-[var(--pf-ink-muted)]">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="h-4 w-4 rounded border-[var(--pf-border-strong)]"
            />
            {t('products.selectAllShown').replace('{count}', String(filteredArticles.length))}
          </label>
        )}

        {selectedCodes.size > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-[var(--pf-radius-sm)] border border-[var(--pf-accent)]/30 bg-[var(--pf-accent-soft)] px-3 py-2">
            <span className="text-[12.5px] font-medium text-[var(--pf-accent)]">{selectedCodes.size} {t('products.selected')}</span>
            <Button size="xs" variant="secondary" onClick={() => setBulkRuleOpen(true)} disabled={!perArticleOn}>
              {t('products.setRule')}
            </Button>
            <Button size="xs" variant="danger" onClick={bulkRemove}>
              {t('common.remove')}
            </Button>
            <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setSelectedCodes(new Set())}>
              {t('products.clear')}
            </Button>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <DataTable columns={columns} rows={[]} loading pageSize={8} />
          ) : rules.articles.length === 0 ? (
            <EmptyState
              title={t('products.noEligibleYet')}
              description={t('products.noEligibleYetDesc')}
              icon={<Package className="h-5 w-5" />}
              action={
                <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
                  {t('products.addArticle')}
                </Button>
              }
            />
          ) : grouped ? (
            <div className="space-y-4">
              {grouped.map(([rayon, articles]) => (
                <div key={rayon}>
                  <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--pf-ink-faint)]">
                    {rayon} <span className="font-mono tabular">({articles.length})</span>
                  </div>
                  <DataTable columns={columns} rows={articles} pageSize={8} sticky={false} />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredArticles}
              pageSize={8}
              emptyTitle={t('products.noArticlesMatch')}
              emptyDescription={t('products.noArticlesMatchDesc')}
            />
          )}
        </div>
      </Card>

      <AddArticleDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={addArticles} />
      <BulkRuleDialog
        open={bulkRuleOpen}
        count={selectedCodes.size}
        onClose={() => setBulkRuleOpen(false)}
        onApply={bulkSetRule}
      />
      <ImportCsvDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={addArticles} />
      <CopyRulesDialog open={copyOpen} onClose={() => setCopyOpen(false)} rules={rules} targets={otherCampaigns} />
    </div>
  )
}
