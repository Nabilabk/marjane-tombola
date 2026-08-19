/*
  Outline icon set — 1.6px strokes, currentColor, no emoji anywhere in the UI.
  Kept intentionally minimal and geometric to match the "playful but refined"
  stance.
*/
type P = { className?: string }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export const CartIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M3 4h2l1.6 9.2a1.5 1.5 0 0 0 1.5 1.3h7.9a1.5 1.5 0 0 0 1.5-1.2L19 7H6" />
    <circle cx="9" cy="19" r="1.3" />
    <circle cx="17" cy="19" r="1.3" />
  </svg>
)

export const ScanIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    <path d="M4 12h16" />
  </svg>
)

export const GiftIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M3 8h18v3H3zM12 8v12" />
    <path d="M12 8S10.5 4 8.3 4.6C6.8 5 7 7.6 9 8zM12 8s1.5-4 3.7-3.4C17.2 5 17 7.6 15 8z" />
  </svg>
)

export const ArrowLeft = ({ className }: P) => (
  <svg {...base} className={className} width="20" height="20">
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const ArrowRight = ({ className }: P) => (
  <svg {...base} className={className} width="20" height="20">
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const CheckIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

export const CardIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h4" />
  </svg>
)

export const CameraIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
)

export const ShareIcon = ({ className }: P) => (
  <svg {...base} className={className} width="20" height="20">
    <circle cx="6" cy="12" r="2" />
    <circle cx="17" cy="6" r="2" />
    <circle cx="17" cy="18" r="2" />
    <path d="M8 11l7-4M8 13l7 4" />
  </svg>
)

export const SparkIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
  </svg>
)

export const RefreshIcon = ({ className }: P) => (
  <svg {...base} className={className} width="20" height="20">
    <path d="M4 12a8 8 0 0 1 13.6-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.6 5.6L4 16M4 20v-4h4" />
  </svg>
)

export const FlagIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <path d="M5 21V4M5 4h12l-3 4 3 4H5" />
  </svg>
)

export const PauseIcon = ({ className }: P) => (
  <svg {...base} className={className} width="24" height="24">
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9v6M14 9v6" />
  </svg>
)
