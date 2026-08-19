import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Brand } from '../brands'
import { t as defaultDict, type Lang } from '../i18n'
import { pickWeightedIndex, resolveProbabilities } from '../../platform/probabilities'
import Wheel from './components/Wheel.tsx'
import { computeWedgeAngles } from './components/wheelGeometry'
import ParticleField from './components/particle-field.tsx'
import ResultCard from './components/result-card.tsx'
import GameButton from './components/game-button.tsx'
import EditableText from '../EditableText'
import { playSound } from '../sound'
import type { WheelTheme } from './components/wheelTheme'
import './dice-theme.css'

/*
  Wheel — the third selectable tombola mechanic, alongside Dice+Cards and
  Cups. A single spin decides the prize directly: no separate pick step
  after it, this screen hands `onResult` straight to CampaignEngine's
  result flow, same contract CardsScreen/CupsScreen already use.

  Prize draw is client-side, weighted by `brand.probabilities` (admin-set
  odds, %, same index as `brand.prizes` — falls back to a uniform pick when
  odds are missing/mismatched, see `resolveProbabilities`). There's no
  backend "spin" endpoint, unlike the dice/cards draw which the backend
  arbitrates. Documented as a deliberate scope choice, not an oversight.
*/
type WheelScreenProps = {
  brand: Brand
  lang: Lang
  onResult: (amount: number) => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
  /** Wheel design (rim/pointer/spin style, shadow, hub logo) — see
   *  campaignToWheelTheme in engine/theme.ts. Optional so previews that
   *  don't have a full campaign (none currently) still render. */
  theme?: WheelTheme
}

// How long to wait before showing the result, per spin style — must roughly
// match how long that style's Framer transition (see Wheel.tsx's
// SPIN_TRANSITION) actually takes to settle, so the number doesn't appear
// before the disc has visibly stopped.
const SPIN_DURATION_MS: Record<NonNullable<WheelTheme['spinStyle']>, number> = {
  smooth: 4000,
  bouncy: 2600,
  mechanical: 3600,
}

export default function WheelScreen({
  brand,
  lang,
  onResult,
  dict = defaultDict,
  editable = false,
  onEditText,
  theme,
}: WheelScreenProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle')
  const [rotation, setRotation] = useState(0)
  const [amount, setAmount] = useState<number | null>(null)

  const prizes = brand.prizes.length > 0 ? brand.prizes : [0]
  // The real, weighted odds still decide which prize is drawn (below) — only
  // the wedges' on-screen size is equal now, see `computeWedgeAngles`.
  const probabilities = resolveProbabilities(prizes, brand.probabilities)
  const wedges = computeWedgeAngles(prizes.length)
  const spinStyle = theme?.spinStyle ?? 'smooth'

  const spin = () => {
    if (phase !== 'idle') return
    setPhase('spinning')
    playSound('diceRoll')

    // Weighted by the admin-set odds, not a uniform pick — a 1%-odds
    // segment lands about 1 spin in 100, matching how thin its wedge looks.
    const chosenIndex = pickWeightedIndex(probabilities)
    const wedge = wedges[chosenIndex]
    // Small random offset within the wedge so it doesn't always land dead
    // center — stays well within the wedge's own bounds either way.
    const jitter = (Math.random() - 0.5) * wedge.size * 0.5
    const extraSpins = 5
    const target = rotation + extraSpins * 360 + ((360 - wedge.mid - jitter + 360) % 360)
    setRotation(target)

    setTimeout(() => {
      const won = prizes[chosenIndex]
      setAmount(won)
      setPhase('result')
      if (won > 0) playSound('win')
      // Let the player see the result for a beat, then move on to the win
      // page automatically — no manual "Continue" tap needed, matching
      // Dice/Cards/Cups.
      setTimeout(() => onResult(won), 1600)
    }, SPIN_DURATION_MS[spinStyle])
  }

  return (
    <div className="dice-page">
      <div className="dice-bg" aria-hidden="true" />
      <ParticleField />

      <div className="dice-content">
        <p className="dice-eyebrow">{dict.wheelStepLabel[lang]}</p>
        <EditableText
          as="h1"
          className="dice-title"
          editable={editable}
          displayValue={dict.wheelTitle[lang]}
          onCommit={(v) => onEditText?.('wheelTitle', lang, v)}
        />
        <EditableText
          as="p"
          className="dice-hint"
          editable={editable}
          displayValue={dict.wheelHint[lang]}
          onCommit={(v) => onEditText?.('wheelHint', lang, v)}
        />

        <Wheel prizes={prizes} rotation={rotation} spinning={phase === 'spinning'} size="lg" theme={theme} />

        <AnimatePresence mode="wait">
          {phase === 'result' && amount !== null && (
            <ResultCard
              value={amount}
              label={dict.wheelResult[lang].replace('{n}', String(amount))}
              sub=""
            />
          )}
        </AnimatePresence>

        <div className="dice-cta">
          {phase === 'idle' && (
            <GameButton onClick={spin}>
              <EditableText
                editable={editable}
                displayValue={dict.wheelSpin[lang]}
                onCommit={(v) => onEditText?.('wheelSpin', lang, v)}
              />
            </GameButton>
          )}

          {phase === 'spinning' && (
            <GameButton loading disabled>
              {dict.wheelSpin[lang]}
            </GameButton>
          )}
        </div>
      </div>
    </div>
  )
}
