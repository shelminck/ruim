import { describe, expect, it } from 'vitest'
import { formatEuros, monthDaysLeftLabel } from '../format'

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

describe('monthDaysLeftLabel', () => {
  it('counts the given day as part of the days left, inclusive', () => {
    expect(monthDaysLeftLabel(new Date(2026, 8, 20))).toBe('september · nog 11 dagen')
  })

  it('uses singular "dag" for the last day of the month', () => {
    expect(monthDaysLeftLabel(new Date(2026, 8, 30))).toBe('september · nog 1 dag')
  })
})
