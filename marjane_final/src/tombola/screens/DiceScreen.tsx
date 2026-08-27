import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Brand } from '../brands'
import { t as defaultDict, type Lang } from '../i18n'
import Dice from './components/dice.tsx'
import ParticleField from './components/particle-field.tsx'
import ResultCard from './components/result-card.tsx'
import GameButton from './components/game-button.tsx'
import EditableText from '../EditableText'
import type { CardsTheme } from './components/cardsTheme'
import './dice-theme.css'

// See CardsScreen.tsx / ScratchScreen.tsx for why this can't be a bare
// relative '/api/...' path.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

type DiceScreenProps = {
  brand: Brand
  lang: Lang
  onResult: (diceValue: number, pickLimit: number) => void
  dict?: Record<string, { fr: string; ar: string; en?: string }>
  editable?: boolean
  onEditText?: (key: string, lang: Lang, value: string) => void
  /** Dice + Cards design (cube style, glow color) — see
   *  campaignToCardsTheme in engine/theme.ts. */
  theme?: CardsTheme
}

export default function DiceScreen({
  brand: _brand,
  lang,
  onResult,
  dict = defaultDict,
  editable = false,
  onEditText,
  theme,
}: DiceScreenProps) {
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'result'>('idle')
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [rollError, setRollError] = useState(false)

  // --- business logic unchanged from the original screen ---
  const rollDice = async () => {
    if (phase !== 'idle') return
    setPhase('rolling')
    setDiceValue(null)
    setRollError(false)

    try {
      const response = await fetch(`${API_BASE}/api/dice/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      setTimeout(() => {
        setDiceValue(data.value)
        setPhase('result')
        // Let the player see the result for a beat, then move on to the
        // cards screen automatically — no manual "Continue" tap needed.
        setTimeout(() => onResult(data.value, data.pick_limit), 1400)
      }, 1500)
    } catch (error) {
      console.error('Dice roll failed:', error)
      setPhase('idle')
      setRollError(true)
    }
  }
  // --- end unchanged business logic ---

  const resultSub =
    diceValue !== null
      ? dict.cardsPick[lang].replace('{n}', `${diceValue}`).replace('{s}', diceValue > 1 ? 's' : '')
      : ''

  return (
    <div className="dice-page">
      <div className="dice-bg" aria-hidden="true" />
      <ParticleField />

      <div className="dice-content">
        <p className="dice-eyebrow">{dict.diceStepLabel[lang]}</p>
        <EditableText
          as="h1"
          className="dice-title"
          editable={editable}
          displayValue={dict.diceTitle[lang]}
          onCommit={(v) => onEditText?.('diceTitle', lang, v)}
        />
        <EditableText
          as="p"
          className="dice-hint"
          editable={editable}
          displayValue={dict.diceHint[lang]}
          onCommit={(v) => onEditText?.('diceHint', lang, v)}
        />

        <Dice value={diceValue} rolling={phase === 'rolling'} size="lg" theme={theme} />

        <AnimatePresence mode="wait">
          {phase === 'result' && diceValue !== null && (
            <ResultCard
              value={diceValue}
              label={dict.diceResult[lang].replace('{n}', `${diceValue}`)}
              sub={resultSub}
            />
          )}
        </AnimatePresence>

        <div className="dice-cta">
          {phase === 'idle' && (
            <GameButton onClick={rollDice}>
              <EditableText
                editable={editable}
                displayValue={dict.diceRoll[lang]}
                onCommit={(v) => onEditText?.('diceRoll', lang, v)}
              />
            </GameButton>
          )}

          {(phase === 'rolling' || phase === 'result') && (
            <GameButton loading disabled>
              <EditableText
                editable={editable}
                displayValue={dict.diceRoll[lang]}
                onCommit={(v) => onEditText?.('diceRoll', lang, v)}
              />
            </GameButton>
          )}

          <AnimatePresence>
            {rollError && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-3 rounded-xl px-4 py-3 text-[13px]"
                style={{ background: '#fbecec', color: '#b73333' }}
              >
                {lang === 'ar' ? 'تعذر رمي النرد. حاول مرة أخرى.' : 'Le dé n’a pas pu être lancé. Réessayez.'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}