import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { t as defaultDict, type Lang } from '../i18n'
import { ScreenTitle, PrimaryButton, InfoCard } from '../ui'
import { ArrowRight, ArrowLeft, GiftIcon } from '../icons'
import EditableText from '../EditableText'

function FieldError({ children }: { children: string }) {
  return (
    <AnimatePresence>
      <motion.p
        initial={{ opacity: 0, y: -4, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.18 }}
        className="mt-1 text-[12px] text-[#d64545]"
      >
        {children}
      </motion.p>
    </AnimatePresence>
  )
}

/*
  Moroccan mobile numbers: 06 or 07 followed by 8 digits (national), optionally
  in +212 / 00212 international form. We normalise then validate.
*/
function validMoroccan(raw: string): boolean {
  const digits = raw.replace(/[\s.-]/g, '')
  return /^(?:(?:\+212|00212)|0)(6|7)\d{8}$/.test(digits)
}

// Numbers that have "already participated" — demonstrates the duplicate state.
const USED = new Set(['0612345678', '+212612345678'])

export default function FormScreen({
  lang,
  onSubmit,
  dict = defaultDict,
  editable = false,
  onEditText,
}: {
  lang: Lang
  onSubmit: (data: { firstName: string; lastName: string; phone: string }) => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
}) {
  const [firstName, setFirst] = useState('')
  const [lastName, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const rtl = lang === 'ar'
  const Arrow = rtl ? ArrowLeft : ArrowRight

  const submit = () => {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = dict.errRequired[lang]
    if (!lastName.trim()) e.lastName = dict.errRequired[lang]
    if (!phone.trim()) e.phone = dict.errRequired[lang]
    else if (!validMoroccan(phone)) e.phone = dict.errPhone[lang]
    else if (USED.has(phone.replace(/[\s.-]/g, ''))) e.phone = dict.errUsed[lang]
    if (!consent) e.consent = dict.errConsent[lang]
    setErrors(e)
    if (Object.keys(e).length === 0) onSubmit({ firstName, lastName, phone })
  }

  const field =
    'w-full rounded-xl border bg-[color:var(--field)] px-4 py-3 text-[15px] outline-none transition-all duration-150 focus:ring-4 focus:shadow-[0_2px_10px_-2px_rgba(0,0,0,0.08)]'

  const fieldStyle = (err?: string) =>
    ({
      borderColor: err ? '#d64545' : 'var(--hairline)',
      ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--brand-primary) 24%, transparent)',
    }) as React.CSSProperties

  return (
    <div className="max-w-lg">
      <motion.span
        initial={{ scale: 0, rotate: -16, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
        className="mb-4 inline-grid h-12 w-12 place-items-center rounded-2xl text-white"
        style={{
          background: 'linear-gradient(155deg, color-mix(in srgb, var(--brand-primary) 85%, white 15%), var(--brand-primary))',
          boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--brand-primary) 55%, transparent)',
        }}
      >
        <GiftIcon className="h-6 w-6" />
      </motion.span>

      <ScreenTitle
        label={dict.formStepLabel[lang]}
        title={
          <EditableText
            editable={editable}
            displayValue={dict.formTitle[lang]}
            onCommit={(v) => onEditText?.('formTitle', lang, v)}
          />
        }
      />

      <InfoCard className="p-6 sm:p-7">
      <form
        className="space-y-5"
        onSubmit={(ev) => {
          ev.preventDefault()
          submit()
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
              {dict.firstName[lang]}
            </label>
            <input className={field} style={fieldStyle(errors.firstName)} value={firstName} onChange={(e) => setFirst(e.target.value)} />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
              {dict.lastName[lang]}
            </label>
            <input className={field} style={fieldStyle(errors.lastName)} value={lastName} onChange={(e) => setLast(e.target.value)} />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
            {dict.phone[lang]}
          </label>
          <input
            className={field}
            style={fieldStyle(errors.phone)}
            value={phone}
            inputMode="tel"
            placeholder="ex : 06 12 34 56 78"
            dir="ltr"
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <FieldError>{errors.phone}</FieldError>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[color:var(--brand-primary)] transition-transform active:scale-90"
          />
          <span>
            {dict.consentPrefix[lang]}
            <a
              href="/reglement-tombola-digitale.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:opacity-80"
              style={{ color: 'var(--brand-primary)' }}
            >
              {dict.consentLink[lang]}
            </a>
            {dict.consentSuffix[lang]}
          </span>
        </label>
        {errors.consent && <div className="-mt-2"><FieldError>{errors.consent}</FieldError></div>}

        <div className="pt-2">
          <PrimaryButton type="submit">
            <EditableText
              editable={editable}
              displayValue={dict.formCta[lang]}
              onCommit={(v) => onEditText?.('formCta', lang, v)}
            />
            <Arrow className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </form>
      </InfoCard>
    </div>
  )
}
