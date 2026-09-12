import { describe, expect, it } from 'vitest'
import { computeLabelStats } from '../labels'

describe('computeLabelStats', () => {
  it('averages spend across the distinct months the label actually appears in', () => {
    const transactions = [
      { labelIds: ['auto2'], amountCents: -20000, bookedAt: '2026-08-05', envelopeId: 'vervoer' },
      { labelIds: ['auto2'], amountCents: -30000, bookedAt: '2026-09-05', envelopeId: 'vervoer' },
      { labelIds: ['auto2'], amountCents: -10000, bookedAt: '2026-09-20', envelopeId: 'verzekeringen' },
    ]

    const stats = computeLabelStats('auto2', transactions)

    // total 60000 over 2 distinct months (aug, sep) = 30000/month
    expect(stats.monthlyAverageCents).toBe(30000)
    expect(stats.yearlyCents).toBe(360000)
  })

  it('ignores transactions without the label and incoming money', () => {
    const transactions = [
      { labelIds: ['auto2'], amountCents: -10000, bookedAt: '2026-09-05', envelopeId: 'vervoer' },
      { labelIds: ['huisdieren'], amountCents: -5000, bookedAt: '2026-09-05', envelopeId: 'vervoer' },
      { labelIds: ['auto2'], amountCents: 20000, bookedAt: '2026-09-06', envelopeId: 'vervoer' }, // income, excluded
    ]

    const stats = computeLabelStats('auto2', transactions)
    expect(stats.monthlyAverageCents).toBe(10000)
  })

  it('breaks the total down by envelope, sorted from biggest to smallest', () => {
    const transactions = [
      { labelIds: ['auto2'], amountCents: -20000, bookedAt: '2026-09-05', envelopeId: 'vervoer' },
      { labelIds: ['auto2'], amountCents: -5000, bookedAt: '2026-09-06', envelopeId: 'verzekeringen' },
      { labelIds: ['auto2'], amountCents: -15000, bookedAt: '2026-09-07', envelopeId: 'vervoer' },
    ]

    const stats = computeLabelStats('auto2', transactions)
    expect(stats.byEnvelope).toEqual([
      { envelopeId: 'vervoer', amountCents: 35000 },
      { envelopeId: 'verzekeringen', amountCents: 5000 },
    ])
  })

  it('returns zeroes for a label with no matching transactions', () => {
    const stats = computeLabelStats('missing', [])
    expect(stats.monthlyAverageCents).toBe(0)
    expect(stats.yearlyCents).toBe(0)
    expect(stats.byEnvelope).toEqual([])
  })
})
