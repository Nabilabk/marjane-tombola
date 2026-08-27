import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins truthy string parts with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('drops false, null and undefined parts', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('supports conditional classes written inline', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active')
  })

  it('returns an empty string when nothing survives', () => {
    expect(cn(false, null, undefined)).toBe('')
  })
})
