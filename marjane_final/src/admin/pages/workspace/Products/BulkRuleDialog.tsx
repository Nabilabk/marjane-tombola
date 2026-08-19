import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { Select, Input, Field } from '../../../components/ui/Field'
import { Button } from '../../../components/ui/Button'
import type { RuleType } from '../../../services/articleCatalogApi'
import { useAdminLang } from '../../../lib/adminI18n'

/** Applies one ruleType/threshold to every currently-selected row at once —
 * the per-article table otherwise forces editing rows one at a time. */
export function BulkRuleDialog({
  open,
  count,
  onClose,
  onApply,
}: {
  open: boolean
  count: number
  onClose: () => void
  onApply: (ruleType: RuleType, threshold: number) => void
}) {
  const [ruleType, setRuleType] = useState<RuleType>('quantity')
  const [threshold, setThreshold] = useState(1)
  const { t } = useAdminLang()

  function handleApply() {
    if (threshold <= 0) return
    onApply(ruleType, threshold)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('bulkRule.title')}
      description={t('bulkRule.desc').replace('{count}', String(count))}
      width={420}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Field label={t('products.rule')}>
              <Select value={ruleType} onChange={(e) => setRuleType(e.target.value as RuleType)}>
                <option value="quantity">{t('products.quantityGte')}</option>
                <option value="price">{t('products.spendGte')}</option>
              </Select>
            </Field>
          </div>
          <div className="w-28">
            <Field label={t('products.threshold')}>
              <Input
                type="number"
                min={ruleType === 'price' ? 0 : 1}
                step={ruleType === 'price' ? 0.5 : 1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--pf-border)] pt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={threshold <= 0}>
            {t('bulkRule.applyTo').replace('{count}', String(count))}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
