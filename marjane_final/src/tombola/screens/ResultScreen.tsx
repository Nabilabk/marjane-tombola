import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { t as defaultDict, type Lang } from '../i18n'
import { ScreenTitle, PrimaryButton, GhostButton } from '../ui'
import { CardIcon, ShareIcon, SparkIcon, CheckIcon, RefreshIcon } from '../icons'
import Confetti from '../Confetti'
import EditableText from '../EditableText'
import { playSound } from '../sound'

/* Amount counts up from 0 to the final value for a celebratory reveal. */
function CountUp({ to }: { to: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.1,
      delay: 0.35,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    })
    return () => controls.stop()
  }, [to])
  return <>{val}</>
}

export default function ResultScreen({
  lang,
  amount,
  onHome,
  dict = defaultDict,
  editable = false,
  onEditText,
}: {
  lang: Lang
  amount: number
  onHome: () => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
}) {
  const won = amount > 0

  useEffect(() => {
    if (won) playSound('win')
  }, [won])

const handleShare = async () => {
  const shareData = {
    title: 'Tombola Marjane',
    text: `🎉 Je viens de gagner ${amount} ${dict.dhm[lang]} grâce à la Tombola Digitale Marjane !

Et vous, tentez votre chance dès maintenant ! 🍀`,
    url: 'https://tombola.marjane.ma', // Remplace par ton vrai site
  }

  try {
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      )
      alert('Message copié !')
    }
  } catch (err) {
    console.log(err)
  }
}
  if (won) {
    return (
      <div className="relative max-w-lg">
        <Confetti />
        <ScreenTitle
          label={dict.resultStepLabel[lang]}
          title={
            <EditableText
              editable={editable}
              displayValue={dict.winTitle[lang]}
              onCommit={(v) => onEditText?.('winTitle', lang, v)}
            />
          }
        />

        <div className="relative">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: 'color-mix(in srgb, var(--brand-secondary) 45%, transparent)' }}
            animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.12, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="relative overflow-hidden rounded-[2rem] border p-8 text-center backdrop-blur-xl"
            style={{
              borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, var(--hairline))',
              background: 'linear-gradient(160deg, color-mix(in srgb, var(--brand-primary) 14%, var(--card)), color-mix(in srgb, var(--card) 82%, transparent))',
              boxShadow: '0 28px 60px -28px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
            }}
          >
            <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center">
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--brand-secondary)', opacity: 0.4 }}
                animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.25 }}
                className="relative grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
                style={{
                  background: 'linear-gradient(155deg, color-mix(in srgb, var(--brand-primary) 85%, white 15%), var(--brand-primary))',
                }}
              >
                <SparkIcon className="h-8 w-8" />
              </motion.span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 76,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: 'var(--ink)',
                  textShadow: '0 0 32px color-mix(in srgb, var(--brand-primary) 35%, transparent)',
                }}
              >
                <CountUp to={amount} />
              </span>
              <span className="text-[20px] font-bold" style={{ color: 'var(--brand-primary)' }}>
                {dict.dhm[lang]}
              </span>
            </div>

            <div
              className="mx-auto mt-6 flex max-w-xs items-center gap-3 rounded-2xl border px-4 py-3 text-left backdrop-blur-md"
              style={{ borderColor: 'color-mix(in srgb, var(--hairline) 160%, transparent)', background: 'color-mix(in srgb, var(--card) 65%, transparent)' }}
            >
              <span style={{ color: 'var(--brand-primary)' }}>
                <CardIcon className="h-5 w-5" />
              </span>
              <EditableText
                as="span"
                className="text-[13px]"
                style={{ color: 'var(--ink-muted)' }}
                editable={editable}
                displayValue={dict.winCredited[lang]}
                onCommit={(v) => onEditText?.('winCredited', lang, v)}
              />
              <span className="ms-auto" style={{ color: 'var(--brand-primary)' }}>
                <CheckIcon className="h-5 w-5" />
              </span>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
           <PrimaryButton onClick={handleShare}>
        <ShareIcon className="h-4 w-4" />
        {dict.share[lang]}
      </PrimaryButton>

      <GhostButton  onClick={onHome}>
        {dict.backHome[lang]}
      </GhostButton>
    </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <ScreenTitle
        label={dict.resultStepLabel[lang]}
        title={
          <EditableText
            editable={editable}
            displayValue={dict.loseTitle[lang]}
            onCommit={(v) => onEditText?.('loseTitle', lang, v)}
          />
        }
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[2rem] border p-8 text-center backdrop-blur-xl"
        style={{
          borderColor: 'color-mix(in srgb, var(--hairline) 160%, transparent)',
          background: 'color-mix(in srgb, var(--card) 74%, transparent)',
          boxShadow: '0 20px 44px -24px rgba(0,0,0,0.18)',
        }}
      >
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg"
          style={{
            background: 'linear-gradient(155deg, color-mix(in srgb, var(--brand-secondary) 85%, white 15%), var(--brand-secondary))',
            boxShadow: '0 10px 24px -8px color-mix(in srgb, var(--brand-secondary) 45%, transparent)',
          }}
        >
          <motion.span
            animate={{ rotate: [0, -18, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <RefreshIcon className="h-7 w-7" />
          </motion.span>
        </motion.span>
        <EditableText
          as="p"
          className="mx-auto max-w-sm text-[15px] leading-relaxed"
          style={{ color: 'var(--ink-muted)' }}
          editable={editable}
          displayValue={dict.loseSub[lang]}
          onCommit={(v) => onEditText?.('loseSub', lang, v)}
        />
        <div className="mt-7 flex justify-center">
          <PrimaryButton onClick={onHome}>{dict.backHome[lang]}</PrimaryButton>
        </div>
      </motion.div>
    </div>
  )
}
