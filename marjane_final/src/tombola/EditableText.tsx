import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'

export interface EditableTextProps {
  /** Host tag — preserves whatever typography the caller already applies via className/style. */
  as?: 'span' | 'p' | 'h1' | 'div'
  className?: string
  style?: CSSProperties
  /** Off by default: renders a plain, pixel-identical passthrough — no contentEditable, no
      listeners, no styling changes. This is what makes it safe on the public site. */
  editable?: boolean
  /** What's shown (post-interpolation, e.g. "Choisissez 3 cartes"). */
  displayValue: string
  /** What's actually edited/saved; defaults to displayValue. Diverges from displayValue for
      interpolated strings (e.g. the raw "Choisissez {n} carte{s}" template), so editing never
      bakes in one specific substituted value. */
  editValue?: string
  /** Fires on blur/Enter, only when the value actually changed. */
  onCommit?: (value: string) => void
  /** Outline/tint color. Defaults to the brand-primary color, which works on
      light backgrounds; pass a light color (e.g. white-based) when this sits
      on a dark, brand-colored surface like the campaign header. */
  accentColor?: string
}

/**
 * Inline, click-to-edit text for the admin's live preview. Renders via
 * `contentEditable` on the SAME host tag the screen already uses, so typography
 * (font/weight/color set through className/style on things like
 * <h1 className="dice-title">) carries over with zero layout shift, and RTL
 * ("dir") is inherited natively — no logical-property bookkeeping needed.
 */
export default function EditableText({
  as = 'span',
  className,
  style,
  editable = false,
  displayValue,
  editValue = displayValue,
  onCommit,
  accentColor = 'var(--brand-primary)',
}: EditableTextProps) {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const cancelledRef = useRef(false)

  // `as` is already constrained to a small union of plain HTML tags by
  // EditableTextProps; a dynamic tag otherwise makes TS compose an unwieldy
  // intersection of every intrinsic element's handler types, so it's typed
  // loosely here rather than fighting that.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = as as any

  if (!editable) {
    return <Tag className={className} style={style}>{displayValue}</Tag>
  }

  // Three visibility tiers so an admin can actually SEE what's editable —
  // a hover-only affordance is too easy to miss in a small phone preview:
  //  - resting: a faint dashed outline, always on, so editable text reads
  //    as "different" from static text at a glance.
  //  - hover: a stronger outline + light brand-tinted background.
  //  - focused (actively editing): solid brand-colored outline + background.
  const outline = focused
    ? `2px solid ${accentColor}`
    : hovered
      ? `1.5px dashed ${accentColor}`
      : `1px dashed color-mix(in srgb, ${accentColor} 35%, transparent)`
  const background = focused
    ? `color-mix(in srgb, ${accentColor} 10%, transparent)`
    : hovered
      ? `color-mix(in srgb, ${accentColor} 6%, transparent)`
      : 'transparent'

  return (
    <Tag
      key={editValue}
      className={className}
      style={{
        ...style,
        outline,
        outlineOffset: 2,
        background,
        borderRadius: 4,
        cursor: 'text',
        transition: 'outline-color 0.15s ease, background-color 0.15s ease',
      }}
      contentEditable
      suppressContentEditableWarning
      // Some editable fields (e.g. the scan dropzone hint) sit inside a
      // clickable ancestor (a <button> that opens the file picker). Without
      // this, clicking in to edit would also fire that ancestor's onClick.
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        setFocused(false)
        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }
        const next = e.currentTarget.textContent ?? ''
        if (next !== editValue) onCommit?.(next)
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          cancelledRef.current = true
          e.currentTarget.textContent = editValue
          e.currentTarget.blur()
        }
      }}
    >
      {editValue}
    </Tag>
  )
}
