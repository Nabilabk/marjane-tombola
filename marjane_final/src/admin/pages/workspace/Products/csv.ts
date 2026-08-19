/**
 * Hand-rolled CSV helpers for the Products import/export flow. The shape is
 * simple enough (a handful of flat, comma-safe columns) that pulling in a
 * CSV library would be pure overhead — this covers quoted fields with
 * embedded commas/quotes, which is the only real edge case here.
 */

import type { ArticleRule, RuleType } from '../../../services/articleCatalogApi'

export interface ImportRow {
  code: string
  ruleType: RuleType | null
  threshold: number | null
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

/**
 * Parses a CSV with a `code` column (required) and optional `ruleType` /
 * `threshold` columns. Header row is required so column order doesn't
 * matter. Blank lines are skipped.
 */
export function parseArticlesCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const codeIdx = header.findIndex((h) => h === 'code' || h === 'article' || h === 'gencode')
  const ruleIdx = header.findIndex((h) => h === 'ruletype' || h === 'rule' || h === 'rule_type')
  const thresholdIdx = header.findIndex((h) => h === 'threshold' || h === 'seuil')

  if (codeIdx === -1) {
    throw new Error('CSV needs a "code" column.')
  }

  const rows: ImportRow[] = []
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const code = cells[codeIdx]?.trim()
    if (!code) continue

    const ruleRaw = ruleIdx !== -1 ? cells[ruleIdx]?.trim().toLowerCase() : ''
    const ruleType: RuleType | null = ruleRaw === 'price' ? 'price' : ruleRaw === 'quantity' ? 'quantity' : null

    const thresholdRaw = thresholdIdx !== -1 ? cells[thresholdIdx]?.trim() : ''
    const thresholdNum = thresholdRaw ? Number(thresholdRaw) : NaN
    const threshold = Number.isFinite(thresholdNum) ? thresholdNum : null

    rows.push({ code, ruleType, threshold })
  }
  return rows
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function articlesToCsv(articles: ArticleRule[]): string {
  const header = ['code', 'libelle', 'marq', 'fournisseur', 'rayon', 'price', 'ruleType', 'threshold']
  const lines = [header.join(',')]
  for (const a of articles) {
    lines.push(
      [
        csvCell(a.code),
        csvCell(a.libelle),
        csvCell(a.marq),
        csvCell(a.fournisseur),
        csvCell(a.rayon),
        csvCell(a.price),
        csvCell(a.ruleType),
        csvCell(a.threshold),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
