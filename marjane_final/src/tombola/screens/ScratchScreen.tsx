import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Brand } from '../brands'
import { t as defaultDict, type Lang } from '../i18n'
import ParticleField from './components/particle-field.tsx'
import GameButton from './components/game-button.tsx'
import ScratchCard3D from './components/scratch/ScratchCard3D'
import EditableText from '../EditableText'
import type { ScratchCardCopy, ScratchCardTheme } from './components/scratch/types'
import './dice-theme.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

type Phase = 'loading' | 'ready' | 'done' | 'error'

type ScratchScreenProps = {
  /** `brand.id` is the campaign slug (see campaignToBrand in
   *  engine/theme.ts) — needed so /api/play knows which site's campaign
   *  to draw against, same as every sibling game screen. */
  brand: Brand
  scratchTheme: ScratchCardTheme
  lang: Lang
  onResult: (amount: number) => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
}

/*
  Thin screen wrapper around ScratchCard3D — same role CupsScreen used to
  play: owns the /api/play draw + the phase state machine, the reusable
  card component only knows about `theme`/`prize`/`copy`. Single reveal,
  no pick-count/shuffle step (unlike Cards/Cups), matching the brief:
  the card is already scratchable the moment this screen mounts.
*/
export default function ScratchScreen({
  brand,
  scratchTheme,
  lang,
  onResult,
  dict = defaultDict,
  editable = false,
  onEditText,
}: ScratchScreenProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [amount, setAmount] = useState(0)

  async function draw() {
    setPhase('loading')
    try {
      const res = await fetch(`${API_BASE}/api/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: brand.id, pick_limit: 1 }),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data: { prizes: number[] } = await res.json()
      setAmount(data.prizes[0] ?? 0)
      setPhase('ready')
    } catch (error) {
      console.error('Scratch draw failed:', error)
      setPhase('error')
    }
  }

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRevealed(won: number) {
    setPhase('done')
    setTimeout(() => onResult(won), 700)
  }

  const copy: ScratchCardCopy = {
    scratchLabel: dict.scratchFoilLabel[lang],
    winLabel: dict.scratchWinTitle[lang],
    loseLabel: dict.scratchLoseTitle[lang],
    currencyLabel: dict.dhm[lang],
  }

  const hint =
    phase === 'loading'
      ? dict.scratchHintReady[lang]
      : phase === 'ready'
        ? dict.scratchHintScratching[lang]
        : phase === 'done'
          ? dict.scratchRevealing[lang]
          : dict.scratchErrorRetry[lang]

  return (
    <div className="dice-page">
      <div className="dice-bg" aria-hidden="true" />
      <ParticleField />

      <div className="dice-content">
        <p className="dice-eyebrow">{dict.scratchStepLabel[lang]}</p>
        <EditableText
          as="h1"
          className="dice-title"
          editable={editable}
          displayValue={dict.scratchTitle[lang]}
          onCommit={(v) => onEditText?.('scratchTitle', lang, v)}
        />
        <EditableText
          as="p"
          className="dice-hint"
          editable={editable && phase === 'loading'}
          displayValue={hint}
          editValue={dict.scratchHintReady[lang]}
          onCommit={(v) => onEditText?.('scratchHintReady', lang, v)}
        />

        <div className="dice-stage">
          {phase === 'loading' ? (
            <div className="scratch-loading" role="status">
              <span className="dice-btn-spinner" aria-hidden="true" />
            </div>
          ) : phase === 'error' ? null : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ScratchCard3D
                  theme={scratchTheme}
                  prize={{ amount }}
                  copy={copy}
                  onRevealed={handleRevealed}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="dice-cta">
          {phase === 'error' && (
            <>
              <GameButton onClick={draw}>{dict.scratchErrorRetry[lang]}</GameButton>
              <p className="mt-3 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
                {lang === 'ar' ? 'تعذر توزيع الجائزة. حاول مرة أخرى.' : 'Le tirage a échoué. Réessayez.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
