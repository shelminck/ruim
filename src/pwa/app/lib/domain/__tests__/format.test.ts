import { describe, expect, it } from 'vitest'
import { formatEuros } from '../format'

describe('formatEuros', () => {
  it('drops decimals for whole euros and uses a dot for thousands', () => {
    expect(formatEuros(123400)).toBe('€ 1.234')
  })

  it('shows cents when the amount is not a whole euro', () => {
    expect(formatEuros(5075)).toBe('€ 50,75')
  })

  it('uses the minus sign (U+2212), not a hyphen, for negative amounts', () => {
    expect(formatEuros(-1200)).toBe('−€ 12')
  })
})
