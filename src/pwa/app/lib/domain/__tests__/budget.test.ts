import { describe, expect, it } from 'vitest'
import {
  aggregateProgress,
  effectiveBudgetCents,
  envelopeProgress,
  spentCentsForDay,
  spentCentsForEnvelope,
  standForRatio,
  totalRemainingClampedCents,
} from '../budget'

describe('standForRatio', () => {
  it('is ruim at or below 75%', () => {
    expect(standForRatio(0)).toBe('ruim')
    expect(standForRatio(0.75)).toBe('ruim')
  })

  it('is krap between 75% and 100%', () => {
    expect(standForRatio(0.76)).toBe('krap')
    expect(standForRatio(0.99)).toBe('krap')
  })

  it('is op at or above 100%', () => {
    expect(standForRatio(1)).toBe('op')
    expect(standForRatio(1.5)).toBe('op')
  })
})

describe('spentCentsForEnvelope', () => {
  const transactions = [
    { envelopeId: 'boodschappen', bookedAt: '2026-09-05', amountCents: -2500 },
    { envelopeId: 'boodschappen', bookedAt: '2026-09-12', amountCents: -1800 },
    { envelopeId: 'boodschappen', bookedAt: '2026-08-30', amountCents: -9999 }, // wrong month
    { envelopeId: 'vervoer', bookedAt: '2026-09-06', amountCents: -500 }, // wrong envelope
    { envelopeId: 'boodschappen', bookedAt: '2026-09-07', amountCents: 5000 }, // income, not spend
  ]

  it('sums only this month\'s outgoing transactions for the given envelope', () => {
    expect(spentCentsForEnvelope(transactions, 'boodschappen', '2026-09')).toBe(4300)
  })

  it('returns 0 when nothing matches', () => {
    expect(spentCentsForEnvelope(transactions, 'kleding', '2026-09')).toBe(0)
  })
})

describe('spentCentsForDay', () => {
  const transactions = [
    { bookedAt: '2026-09-12', amountCents: -2500 },
    { bookedAt: '2026-09-12', amountCents: -1800 },
    { bookedAt: '2026-09-11', amountCents: -9999 }, // wrong day
    { bookedAt: '2026-09-12', amountCents: 5000 }, // income, not spend
  ]

  it('sums only outgoing transactions booked on the given day', () => {
    expect(spentCentsForDay(transactions, '2026-09-12')).toBe(4300)
  })

  it('returns 0 when nothing matches', () => {
    expect(spentCentsForDay(transactions, '2026-01-01')).toBe(0)
  })
})

describe('totalRemainingClampedCents', () => {
  it('matches the design handoff fixture: Boodschappen/Vervoer/Uit eten/Abonnementen/Kleding sums to € 327, not € 315', () => {
    // budget/carried-over/spent per README fixture, Uit eten is overspent (120/0/132 = -12)
    const progresses = [
      envelopeProgress({ budgetCents: 30000, carriedOverCents: 4200 }, 21600), // 126
      envelopeProgress({ budgetCents: 15000, carriedOverCents: 0 }, 5300), // 97
      envelopeProgress({ budgetCents: 12000, carriedOverCents: 0 }, 13200), // -12, overspent
      envelopeProgress({ budgetCents: 7800, carriedOverCents: 0 }, 6900), // 9
      envelopeProgress({ budgetCents: 10000, carriedOverCents: 1500 }, 2000), // 95
    ]
    expect(totalRemainingClampedCents(progresses)).toBe(32700)
  })

  it('floors each envelope at 0 rather than letting overspend drag the total negative', () => {
    const progresses = [
      envelopeProgress({ budgetCents: 10000, carriedOverCents: 0 }, 5000), // 50 remaining
      envelopeProgress({ budgetCents: 10000, carriedOverCents: 0 }, 30000), // -200 remaining, overspent
    ]
    expect(totalRemainingClampedCents(progresses)).toBe(5000)
  })
})

describe('effectiveBudgetCents', () => {
  it('adds the carried-over rest to the budget', () => {
    expect(effectiveBudgetCents({ budgetCents: 30000, carriedOverCents: 4200 })).toBe(34200)
  })
})

describe('envelopeProgress', () => {
  it('matches the Boodschappen fixture from the design handoff (300/42/216)', () => {
    const progress = envelopeProgress({ budgetCents: 30000, carriedOverCents: 4200 }, 21600)
    expect(progress.effectiveBudgetCents).toBe(34200)
    expect(progress.remainingCents).toBe(12600)
    expect(progress.stand).toBe('ruim')
  })

  it('matches the Uit eten fixture, which is overspent (120/0/132)', () => {
    const progress = envelopeProgress({ budgetCents: 12000, carriedOverCents: 0 }, 13200)
    expect(progress.remainingCents).toBe(-1200)
    expect(progress.stand).toBe('op')
  })

  it('treats a zero budget with any spend as fully "op"', () => {
    const progress = envelopeProgress({ budgetCents: 0, carriedOverCents: 0 }, 100)
    expect(progress.stand).toBe('op')
  })
})

describe('aggregateProgress', () => {
  it('combines multiple envelopes into one month-level stand', () => {
    const a = envelopeProgress({ budgetCents: 10000, carriedOverCents: 0 }, 5000) // ruim (50%)
    const b = envelopeProgress({ budgetCents: 10000, carriedOverCents: 0 }, 11000) // op (110%)
    const combined = aggregateProgress([a, b])

    expect(combined.spentCents).toBe(16000)
    expect(combined.effectiveBudgetCents).toBe(20000)
    expect(combined.stand).toBe('krap') // 16000/20000 = 80%, combined can differ from either part
  })
})
