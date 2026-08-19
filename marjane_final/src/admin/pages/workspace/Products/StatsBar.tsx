import { useMemo } from 'react'
import { Package, Tags, Truck, Layers, Coins } from 'lucide-react'
import { StatCard } from '../../../components/ui/StatCard'
import type { ArticleRule } from '../../../services/articleCatalogApi'
import { useAdminLang } from '../../../lib/adminI18n'

/**
 * Catalog-derived "impact" summary for the currently configured article
 * list. There's no line-item data in `receipts` (see backend/app.py — a
 * receipt only records total/store, never which articles matched), so a
 * real "N past receipts would qualify" stat isn't possible from this data.
 * This is the honest substitute: what the current rule set actually covers.
 */
export function StatsBar({ articles }: { articles: ArticleRule[] }) {
  const stats = useMemo(() => {
    const prices = articles.map((a) => a.price).filter((p): p is number => p != null)
    const brands = new Set(articles.map((a) => a.marq).filter(Boolean))
    const fournisseurs = new Set(articles.map((a) => a.fournisseur).filter(Boolean))
    const rayons = new Set(articles.map((a) => a.rayon).filter(Boolean))
    const avgPrice = prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : null
    return {
      count: articles.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice,
      brands: brands.size,
      fournisseurs: fournisseurs.size,
      rayons: rayons.size,
    }
  }, [articles])

  const fmt = (n: number) => `${n.toFixed(2)} MAD`
  const { t } = useAdminLang()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label={t('sidebar.products')} value={String(stats.count)} icon={<Package className="h-3.5 w-3.5" />} />
      <StatCard
        label={t('statsBar.avgPrice')}
        value={stats.avgPrice != null ? fmt(stats.avgPrice) : '—'}
        icon={<Coins className="h-3.5 w-3.5" />}
        hint={stats.minPrice != null && stats.maxPrice != null ? `${fmt(stats.minPrice)} – ${fmt(stats.maxPrice)}` : undefined}
      />
      <StatCard label={t('products.brand')} value={String(stats.brands)} icon={<Tags className="h-3.5 w-3.5" />} />
      <StatCard label={t('products.fournisseur')} value={String(stats.fournisseurs)} icon={<Truck className="h-3.5 w-3.5" />} />
      <StatCard label={t('products.rayon')} value={String(stats.rayons)} icon={<Layers className="h-3.5 w-3.5" />} />
    </div>
  )
}
