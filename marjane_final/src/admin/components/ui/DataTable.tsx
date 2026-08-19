import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAdminLang } from '../../lib/adminI18n'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  sortValue?: (row: T) => string | number
  render?: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  pageSize = 10,
  sticky = true,
  emptyTitle,
  emptyDescription,
}: {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  pageSize?: number
  sticky?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const { t } = useAdminLang()
  const resolvedEmptyTitle = emptyTitle ?? t('common.noResults')
  const resolvedEmptyDescription = emptyDescription ?? t('dataTable.noMatchFilters')

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return rows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [rows, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  function toggleSort(key: string, sortValue?: (row: T) => string | number) {
    if (!sortValue) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="overflow-hidden rounded-[var(--pf-radius-md)] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-xs)]">
      <div className={cn('overflow-x-auto', sticky && 'max-h-[560px] overflow-y-auto')}>
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className={cn('bg-[var(--pf-sunken)]', sticky && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'border-b border-[var(--pf-border)] px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--pf-ink-faint)]',
                    col.sortable && col.sortValue ? 'cursor-pointer select-none hover:text-[var(--pf-ink)]' : '',
                    col.headerClassName,
                  )}
                  onClick={() => toggleSort(col.key, col.sortValue)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && col.sortValue && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-[var(--pf-accent)]" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-[var(--pf-accent)]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className="border-b border-[var(--pf-border)] px-4 py-3.5">
                      <div className="pf-skeleton h-3.5 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center py-14 text-center">
                    <div className="text-[14px] font-semibold text-[var(--pf-ink)]">{resolvedEmptyTitle}</div>
                    <div className="mt-1 max-w-xs text-[12.5px] text-[var(--pf-ink-muted)]">
                      {resolvedEmptyDescription}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={ri}
                  className="group border-b border-[var(--pf-border)] transition-colors last:border-0 hover:bg-[var(--pf-sunken)]/60"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 align-middle text-[var(--pf-ink)]', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-[var(--pf-border)] px-4 py-2.5">
          <div className="font-mono text-[11.5px] text-[var(--pf-ink-faint)] tabular">
            {sorted.length} {t('dataTable.rows')}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] disabled:opacity-40"
              aria-label={t('common.previousPage')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[11.5px] text-[var(--pf-ink-muted)] tabular">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--pf-radius-xs)] text-[var(--pf-ink-muted)] transition-colors hover:bg-[var(--pf-sunken)] disabled:opacity-40"
              aria-label={t('common.nextPage')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

