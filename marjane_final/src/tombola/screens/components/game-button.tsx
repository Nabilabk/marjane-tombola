import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type GameButtonProps = {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export default function GameButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = 'primary',
}: GameButtonProps) {
  return (
    <motion.button
      type="button"
      className={`dice-btn ${variant === 'secondary' ? 'dice-btn--secondary' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      /* Press down into the button's own "ledge" (see .dice-btn's
         box-shadow) instead of just shrinking — reads as a physical
         arcade button rather than a generic pill. Framer sets this via
         inline style, which is why the press lives here and not in a
         CSS :active rule (inline transform would just override it). */
      whileTap={disabled || loading ? undefined : { y: 3, scale: 0.98 }}
      whileHover={disabled || loading ? undefined : { y: -2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
    >
      <span>{children}</span>
    </motion.button>
  )
}
