import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Brand } from '../brands'
import { t as defaultDict, type Lang } from '../i18n'
import { ScreenTitle, PrimaryButton } from '../ui'
import { CameraIcon, CheckIcon, RefreshIcon, ArrowRight, ArrowLeft, SparkIcon } from '../icons'
import { uploadReceipt } from '../services/receiptApi'
import type { ValidationErrorCode } from '../types/receipt'
import EditableText from '../EditableText'

// Messages for the errors the backend can return. Extend this if you add
// more validation rules server-side (e.g. "campaign_ended", "too_old").
const ERROR_MESSAGES: Record<ValidationErrorCode, Partial<Record<Lang, string>>> = {
  no_active_campaign: {
    fr: "Aucune campagne active pour le moment.",
    ar: "لا توجد حملة نشطة حاليًا.",
  },
  ocr_failed: {
    fr: "Impossible de lire le ticket. Réessayez avec une photo plus nette.",
    ar: "تعذر قراءة الفاتورة. حاول مرة أخرى بصورة أوضح.",
  },
  wrong_store: {
    fr: "Ce ticket ne provient pas d'un magasin Marjane.",
    ar: "هذه الفاتورة ليست من متجر مرجان.",
  },
  invalid_receipt_format: {
    fr: "Ce ticket ne ressemble pas à un vrai reçu Marjane. Réessayez avec une photo claire du ticket complet.",
    ar: "لا تبدو هذه الفاتورة كإيصال مرجان حقيقي. حاول مرة أخرى بصورة واضحة للفاتورة كاملة.",
  },
  duplicate_receipt: {
    fr: "Ce ticket a déjà été utilisé.",
    ar: "تم استخدام هذه الفاتورة من قبل.",
  },
  below_minimum: {
    fr: "Le montant du ticket est insuffisant.",
    ar: "مبلغ الفاتورة غير كافٍ.",
  },
  no_qualifying_articles: {
    fr: "Ce ticket ne contient pas les articles requis pour participer.",
    ar: "لا تحتوي هذه الفاتورة على المنتجات المطلوبة للمشاركة.",
  },
  // In practice the campaign-lifecycle gate (CampaignEngine.tsx) stops a
  // real visitor from ever reaching this screen while ended/in maintenance
  // — these only surface if /api/receipt/validate is hit directly.
  campaign_ended: {
    fr: "Cette tombola est terminée.",
    ar: "انتهت هذه المسابقة.",
  },
  campaign_maintenance: {
    fr: "Cette tombola est momentanément indisponible. Revenez bientôt !",
    ar: "هذا اليانصيب غير متاح حاليًا. عودوا قريبًا!",
  },
}

function errorMessage(code: ValidationErrorCode, lang: Lang): string {
  return ERROR_MESSAGES[code]?.[lang] ?? ERROR_MESSAGES[code]?.fr ?? code
}

type Phase = 'idle' | 'analyzing' | 'done'

export default function ScanScreen({
  brand,
  lang,
  onValidate,
  dict = defaultDict,
  editable = false,
  onEditText,
}: {
  brand: Brand
  lang: Lang
  onValidate: (billHash?: string) => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [amount, setAmount] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [userEdited, setUserEdited] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrorCode[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [billHash, setBillHash] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const rtl = lang === 'ar'
  const Arrow = rtl ? ArrowLeft : ArrowRight

  const num = parseFloat(amount) || 0
  const insufficient = phase === 'done' && num < brand.threshold
  const hasBackendErrors = validationErrors.length > 0

  // Auto-advance when scan lands on a sufficient, valid amount and the user
  // hasn't edited it manually.
  useEffect(() => {
    if (phase === 'done' && num >= brand.threshold && !userEdited && !hasBackendErrors) {
      const timer = setTimeout(() => onValidate(billHash), 900)
      return () => clearTimeout(timer)
    }
  }, [phase, num, userEdited, hasBackendErrors, brand.threshold, onValidate, billHash])

  const handleFile = async (file?: File) => {
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setPhase('analyzing')
    setUserEdited(false)
    setValidationErrors([])
    setBillHash(undefined)

    try {
      const result = await uploadReceipt(file, brand.id)
      setValidationErrors(result.errors)
      setAmount(result.receipt ? String(result.receipt.total) : '')
      setBillHash(result.receipt?.imageHash)
    } catch (err) {
      console.error(err)
      setAmount('')
      setValidationErrors(['ocr_failed'])
    }

    setPhase('done')
  }

  const reset = () => {
    setPhase('idle')
    setAmount('')
    setPreview(null)
    setUserEdited(false)
    setValidationErrors([])
    setBillHash(undefined)
  }

  return (
    <div className="max-w-lg">
      <ScreenTitle
        label={dict.scanStepLabel[lang]}
        title={
          <EditableText
            editable={editable}
            displayValue={dict.scanTitle[lang]}
            onCommit={(v) => onEditText?.('scanTitle', lang, v)}
          />
        }
      />

      {phase === 'idle' && (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragActive(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className="group flex w-full flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed px-6 py-14 text-center backdrop-blur-xl transition-all duration-150 hover:bg-black/[0.02]"
          style={{
            borderColor: dragActive ? 'var(--brand-primary)' : 'var(--hairline)',
            background: dragActive
              ? 'color-mix(in srgb, var(--brand-primary) 6%, var(--page))'
              : 'color-mix(in srgb, var(--card) 55%, transparent)',
          }}
        >
          <span
            className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-200 group-hover:scale-105"
            style={{
              background: 'linear-gradient(155deg, color-mix(in srgb, var(--brand-primary) 85%, white 15%), var(--brand-primary))',
              boxShadow: '0 12px 26px -8px color-mix(in srgb, var(--brand-primary) 55%, transparent)',
              transform: dragActive ? 'scale(1.1)' : undefined,
            }}
          >
            <CameraIcon className="h-7 w-7" />
          </span>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
            {dict.scanDrop[lang]}
          </span>
          <EditableText
            as="span"
            className="text-[13px]"
            style={{ color: 'var(--ink-muted)' }}
            editable={editable}
            displayValue={dict.scanDropHint[lang]}
            onCommit={(v) => onEditText?.('scanDropHint', lang, v)}
          />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {phase === 'analyzing' && (
        <div
          className="flex flex-col items-center gap-4 rounded-[1.75rem] border px-6 py-14 backdrop-blur-xl"
          style={{ borderColor: 'color-mix(in srgb, var(--hairline) 160%, transparent)', background: 'color-mix(in srgb, var(--card) 55%, transparent)' }}
        >
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-black/10" style={{ borderTopColor: 'var(--brand-primary)' }} />
          <span className="text-[14px]" style={{ color: 'var(--ink-muted)' }}>
            {dict.analyzing[lang]}
          </span>
        </div>
      )}

      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <div
            className="relative flex items-center gap-4 rounded-[1.75rem] border p-4 backdrop-blur-xl transition-colors duration-300"
            style={{
              borderColor: !insufficient && !hasBackendErrors ? 'color-mix(in srgb, #1a9e5c 40%, var(--hairline))' : 'color-mix(in srgb, var(--hairline) 160%, transparent)',
              background: 'color-mix(in srgb, var(--card) 74%, transparent)',
              boxShadow: '0 20px 44px -24px rgba(0,0,0,0.22)',
            }}
          >
            <AnimatePresence>
              {!insufficient && !hasBackendErrors && num > 0 && (
                <motion.span
                  initial={{ scale: 0, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  className="absolute -right-2.5 -top-2.5 grid h-9 w-9 place-items-center rounded-full text-white shadow-lg"
                  style={{ background: 'var(--brand-secondary)' }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--brand-secondary)' }}
                    animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <SparkIcon className="relative h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
            {preview ? (
              <img src={preview} alt="Ticket" className="h-20 w-16 rounded-lg object-cover" />
            ) : (
              <div className="grid h-20 w-16 place-items-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--brand-primary) 8%, var(--page))', color: 'var(--brand-primary)' }}>
                <CheckIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-[12px] uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>
                {dict.detected[lang]}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <input
                  value={amount}
                  readOnly
                  inputMode="decimal"
                  dir="ltr"
                  className="w-24 border-b-2 bg-transparent text-[30px] outline-none"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    borderColor: 'var(--hairline)',
                    color: 'var(--ink)',
                    cursor: 'default',
                  }}
                />
                <span className="text-[15px]" style={{ color: 'var(--ink-muted)' }}>{dict.dhm[lang]}</span>
              </div>
              <div className="mt-1 text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                {}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl px-4 py-3 text-[13px]" style={{ background: 'color-mix(in srgb, var(--brand-secondary) 6%, var(--page))', color: 'var(--ink-muted)' }}>
            <span>{dict.thresholdInfo[lang]}</span>
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{brand.threshold} {dict.dhm[lang]}</span>
          </div>

          <AnimatePresence>
            {insufficient && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl px-4 py-3 text-[13px]"
                style={{ background: '#fbecec', color: '#b73333' }}
              >
                {dict.errAmount[lang]}
              </motion.p>
            )}

            {/* Backend validation errors: wrong store, duplicate receipt, OCR failure, etc. */}
            {validationErrors.map((code) => (
              <motion.p
                key={code}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl px-4 py-3 text-[13px]"
                style={{ background: '#fbecec', color: '#b73333' }}
              >
                {errorMessage(code, lang)}
              </motion.p>
            ))}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => onValidate(billHash)} disabled={insufficient || num <= 0 || hasBackendErrors}>
              <EditableText
                editable={editable}
                displayValue={dict.scanCta[lang]}
                onCommit={(v) => onEditText?.('scanCta', lang, v)}
              />
              <Arrow className="h-4 w-4" />
            </PrimaryButton>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 text-[14px] font-medium"
              style={{ color: 'var(--ink-muted)' }}
            >
              <RefreshIcon className="h-4 w-4" />
              {dict.retry[lang]}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}