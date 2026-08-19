import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Brand } from '../brands'
import { t as defaultDict, type Lang } from '../i18n'
import Card from './components/Cards.tsx'
import GameButton from './components/game-button.tsx'
import ParticleField from './components/particle-field.tsx'
import EditableText from '../EditableText'
import { playSound } from '../sound'
import type { CardsTheme } from './components/cardsTheme'
import './dice-theme.css'

// See ScratchScreen.tsx for why this can't be a bare relative '/api/...' path.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const CARD_COUNT = 9

type CardsScreenProps = {
  brand: Brand
  lang: Lang
  pickLimit: number  // From dice
  onResult: (amount: number) => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
  /** Dice + Cards design (back pattern, shadow, glow color) — see
   *  campaignToCardsTheme in engine/theme.ts. */
  theme?: CardsTheme
}

export default function CardsScreen({
  brand,
  lang,
  pickLimit,
  onResult,
  dict = defaultDict,
  editable = false,
  onEditText,
  theme,
}: CardsScreenProps) {
  const PICK_LIMIT = Math.min(pickLimit, 6)
  
  type Phase = 'ready' | 'shuffling' | 'picking' | 'done'

  const [phase, setPhase] = useState<Phase>('ready')
  const [cards, setCards] = useState<number[]>(Array(CARD_COUNT).fill(0))
  const [revealed, setRevealed] = useState<boolean[]>(Array(CARD_COUNT).fill(false))
  const [pickedCount, setPickedCount] = useState(0)
  const [order, setOrder] = useState<number[]>(
    Array.from({ length: CARD_COUNT }, (_, i) => i)
  )
  const [shuffleError, setShuffleError] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current)
    }
  }, [])

  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }, [])

  const startShuffle = async () => {
    if (phase !== 'ready') return
    setPhase('shuffling')
    setRevealed(Array(CARD_COUNT).fill(false))
    setPickedCount(0)
    setShuffleError(false)

    let chosen: number[]
    try {
      const res = await fetch(`${API_BASE}/api/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: brand.id, pick_limit: PICK_LIMIT }),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      ;({ prizes: chosen } = await res.json())
    } catch (error) {
      console.error('Card draw failed:', error)
      setPhase('ready')
      setShuffleError(true)
      return
    }

    const next = [...chosen, ...Array(CARD_COUNT - chosen.length).fill(0)]
    const shuffled = shuffleArray(next)
    setCards(shuffled)
    playSound('cardShuffle')

    // Multi-round shuffle with framer-motion layout animations
    let currentOrder = order.slice()
    const rounds = 6
    const roundDelay = 320

    for (let i = 0; i < rounds; i++) {
      await new Promise<void>((resolve) => {
        shuffleTimerRef.current = setTimeout(() => {
          const cardEls = stageRef.current?.querySelectorAll('[data-card-id]')
          if (cardEls) {
            cardEls.forEach((el) => {
              const el2 = el as HTMLElement
              el2.style.zIndex = String(Math.floor(Math.random() * 10))
            })
          }

          currentOrder = shuffleArray(currentOrder)
          setOrder(currentOrder)
          resolve()
        }, i === 0 ? 100 : roundDelay)
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 280))
    await new Promise((resolve) => setTimeout(resolve, 150))
    setPhase('picking')
  }

  const pickCard = (index: number) => {
    if (phase !== 'picking' || revealed[index] || pickedCount >= PICK_LIMIT) return
    playSound('cardFlip')
    const nextRevealed = [...revealed]
    nextRevealed[index] = true
    setRevealed(nextRevealed)
    const nextCount = pickedCount + 1
    setPickedCount(nextCount)
    if (nextCount === PICK_LIMIT) {
      setPhase('done')
      const total = nextRevealed.reduce(
        (sum, isOpen, i) => (isOpen ? sum + cards[i] : sum),
        0
      )
      setTimeout(() => onResult(total), 700)
    }
  }

  const remaining = PICK_LIMIT - pickedCount
  const buttonLabel =
    phase === 'shuffling'
      ? dict.cardsShuffling[lang]
      : phase === 'picking'
        ? dict.cardsPicking[lang]
            .replace('{n}', String(remaining))
            .replace('{s}', remaining > 1 ? 's' : '')
        : phase === 'done'
          ? dict.cardsDone[lang]
          : dict.cardsShuffle[lang]

  const hint =
    phase === 'ready'
      ? dict.cardsHintReady[lang].replace('{n}', String(PICK_LIMIT))
      : phase === 'shuffling'
        ? dict.cardsHintShuffling[lang]
        : phase === 'picking'
          ? dict.cardsHintPicking[lang].replace('{n}', String(remaining))
          : dict.cardsHintDone[lang]

  const hasWinningCards = phase === 'done' && cards.some((v, i) => revealed[i] && v > 0)

  return (
    <div className="dice-page">
      <div className="dice-bg" aria-hidden="true" />
      <ParticleField />

      <div className="dice-content">
        <p className="dice-eyebrow">{dict.cardsStepLabel[lang]}</p>
        <EditableText
          as="h1"
          className="dice-title"
          editable={editable}
          displayValue={dict.cardsTitle[lang]}
          onCommit={(v) => onEditText?.('cardsTitle', lang, v)}
        />
        <EditableText
          as="p"
          className="dice-hint"
          editable={editable && phase === 'ready'}
          displayValue={hint}
          editValue={dict.cardsHintReady[lang]}
          onCommit={(v) => onEditText?.('cardsHintReady', lang, v)}
        />

        <div className="dice-stage" ref={stageRef}>
          {hasWinningCards && (
            <motion.div
              className="dice-stage-glow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                background:
                  'radial-gradient(circle, color-mix(in srgb, var(--dice-gold, #c9a24b) 20%, transparent) 0%, transparent 68%)',
              }}
            />
          )}

          <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-6 mt-2">
            {order.map((id, slotIndex) => (
              <motion.div
                key={id}
                layout
                layoutId={`card-${id}`}
                transition={{
                  layout: {
                    type: 'spring',
                    stiffness: 240,
                    damping: 24,
                    mass: 0.8,
                  },
                }}
                data-card-id={id}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <Card
                  value={cards[slotIndex]}
                  opened={revealed[slotIndex]}
                  canPick={
                    phase === 'ready' ||
                    (phase === 'picking' && !revealed[slotIndex] && pickedCount < PICK_LIMIT)
                  }
                  onClick={() => (phase === 'ready' ? startShuffle() : pickCard(slotIndex))}
                  logoUrl={brand.logoUrl}
                  theme={theme}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="dice-cta">
          {phase === 'ready' && (
            <GameButton onClick={startShuffle}>{buttonLabel}</GameButton>
          )}
          {phase === 'shuffling' && (
            <GameButton loading disabled>
              {buttonLabel}
            </GameButton>
          )}
          {(phase === 'picking' || phase === 'done') && (
            <GameButton disabled>
              {buttonLabel}
            </GameButton>
          )}

          <AnimatePresence>
            {shuffleError && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-3 rounded-xl px-4 py-3 text-[13px]"
                style={{ background: '#fbecec', color: '#b73333' }}
              >
                {lang === 'ar' ? 'تعذر توزيع البطاقات. حاول مرة أخرى.' : 'Le tirage a échoué. Réessayez.'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
