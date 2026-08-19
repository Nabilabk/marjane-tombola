import { motion } from 'framer-motion'

type ResultCardProps = {
  value: number
  label: string
  sub: string
}

/**
 * Presentational only — DiceScreen still owns diceValue / pickLimit
 * and all business logic. This just renders it.
 */
export default function ResultCard({ value, label, sub }: ResultCardProps) {
  return (
    <motion.div
      className="dice-result-card"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.85, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 0.7 }}
    >
      <motion.span
        className="dice-result-number"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        {value}
      </motion.span>
      <span className="dice-result-label">{label}</span>
      <span className="dice-result-sub">{sub}</span>
    </motion.div>
  )
}
