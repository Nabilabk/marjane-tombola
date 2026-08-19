import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePlatformStore } from '../../../lib/store'
import { useShallow } from 'zustand/react/shallow'
import { Badge } from '../../../components/ui/Basics'
import { Input } from '../../../components/ui/Field'
import { SearchInput } from '../../../components/ui/SearchInput'
import { FilterPills } from '../../../components/ui/FilterPills'
import { Languages as LanguagesIcon, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useAdminLang } from '../../../lib/adminI18n'

export default function LanguagesTab() {
  const { t } = useAdminLang()
  const { siteId } = useParams()
  const translations = usePlatformStore(useShallow((s) => s.translationsFor(siteId!)))
  const updateTranslation = usePlatformStore((s) => s.updateTranslation)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'missing'>('all')

  const filtered = useMemo(() => {
    return translations.filter((t) => {
      const matchesQuery =
        t.key.toLowerCase().includes(query.toLowerCase()) ||
        t.fr.toLowerCase().includes(query.toLowerCase()) ||
        t.ar.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'all' || !t.ar || !t.fr
      return matchesQuery && matchesFilter
    })
  }, [translations, query, filter])

  const missing = translations.filter((t) => !t.fr || !t.ar).length
  const complete = translations.length - missing

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchInput value={query} onChange={setQuery} placeholder={t('languages.searchPlaceholder')} className="w-full max-w-[300px]" />
          <FilterPills
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `${t('common.all')} (${translations.length})` },
              { value: 'missing', label: `${t('languages.missing')} (${missing})` },
            ]}
          />
        </div>
        <Badge tone={missing > 0 ? 'warning' : 'success'} dot>
          {missing > 0 ? `${missing} ${t('languages.missingLower')}` : t('languages.allComplete')}
        </Badge>
      </div>

      {/* Coverage bar */}
      <div className="mt-5 flex items-center gap-3 rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-white px-4 py-3 shadow-[var(--pf-shadow-xs)]">
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--pf-radius-sm)] bg-[var(--pf-accent-soft)] text-[var(--pf-accent)]">
          <LanguagesIcon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12.5px] font-medium text-[var(--pf-ink)]">{t('languages.coverage')}</span>
            <span className="font-mono text-[12px] text-[var(--pf-ink-muted)] tabular">
              {translations.length > 0 ? Math.round((complete / translations.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--pf-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--pf-accent)] transition-all duration-500"
              style={{ width: translations.length > 0 ? `${(complete / translations.length) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Translation grid */}
      <div className="mt-4 overflow-hidden rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-white shadow-[var(--pf-shadow-xs)]">
        <div className="grid grid-cols-1 gap-px bg-[var(--pf-border)] md:grid-cols-3">
          <div className="bg-[var(--pf-sunken)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--pf-ink-faint)]">
            {t('languages.key')}
          </div>
          <div className="bg-[var(--pf-sunken)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--pf-ink-faint)]">
            Français
          </div>
          <div className="bg-[var(--pf-sunken)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--pf-ink-faint)]">
            العربية
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 text-center text-[13px] text-[var(--pf-ink-muted)]">
            {t('languages.noMatch')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-[var(--pf-border)] md:grid-cols-3">
            {filtered.map((tr) => {
              const missingFr = !tr.fr
              const missingAr = !tr.ar
              return (
                <div key={tr.key} className="grid grid-cols-1 gap-px bg-[var(--pf-border)] md:col-span-3 md:grid-cols-3">
                  {/* Key */}
                  <div className="flex items-center justify-between gap-2 bg-white px-4 py-3">
                    <span className="font-mono text-[12px] text-[var(--pf-ink)]">{tr.key}</span>
                    {(missingFr || missingAr) ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--pf-warning)]" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--pf-success)]" />
                    )}
                  </div>
                  {/* FR */}
                  <div className={cn('bg-white px-3 py-2', missingFr && 'bg-[var(--pf-warning-soft)]/40')}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--pf-ink-faint)]">FR</span>
                      {missingFr && <Badge tone="warning">{t('languages.missing')}</Badge>}
                    </div>
                    <Input
                      value={tr.fr}
                      dir="ltr"
                      placeholder="Traduction manquante…"
                      onChange={(e) => updateTranslation(siteId!, tr.key, 'fr', e.target.value)}
                    />
                  </div>
                  {/* AR */}
                  <div className={cn('bg-white px-3 py-2', missingAr && 'bg-[var(--pf-warning-soft)]/40')}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--pf-ink-faint)]">AR</span>
                      {missingAr && <Badge tone="warning">{t('languages.missing')}</Badge>}
                    </div>
                    <Input
                      value={tr.ar}
                      dir="rtl"
                      placeholder="الترجمة مفقودة…"
                      onChange={(e) => updateTranslation(siteId!, tr.key, 'ar', e.target.value)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
