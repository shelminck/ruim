import { describe, expect, it } from 'vitest'
import { computeWaterfall } from '../waterfall'

describe('computeWaterfall', () => {
  it('excludes windfall sources from basis and reports them as meevaller', () => {
    const result = computeWaterfall({
      incomeSources: [
        { amountCents: 265000, countsTowardBase: true },
        { amountCents: 118000, countsTowardBase: true },
        { amountCents: 62000, countsTowardBase: false }, // freelance, variable -> windfall
      ],
      subscriptions: [],
      fixedCosts: [],
      envelopes: [],
      goals: [],
    })

    expect(result.binnen).toBe(445000)
    expect(result.basis).toBe(383000)
    expect(result.meevaller).toBe(62000)
  })

  it('only counts active subscriptions toward vasteLasten', () => {
    const result = computeWaterfall({
      incomeSources: [],
      subscriptions: [
        { amountCents: 1200, cancelledAt: null },
        { amountCents: 1800, cancelledAt: '2026-09-01' }, // cancelled -> excluded
      ],
      fixedCosts: [{ amountCents: 143400 }],
      envelopes: [],
      goals: [],
    })

    expect(result.aboTotaal).toBe(1200)
    expect(result.vasteLasten).toBe(144600)
  })

  it('sums envelope budgets and goal deposits, and folds one-off amounts into vrij', () => {
    const result = computeWaterfall({
      incomeSources: [{ amountCents: 410000, countsTowardBase: true }],
      subscriptions: [],
      fixedCosts: [{ amountCents: 143400 }],
      envelopes: [{ budgetCents: 30000 }, { budgetCents: 15000 }, { budgetCents: 12000 }],
      goals: [{ monthlyDepositCents: 10000 }],
      bufferMonthlyCents: 25000,
      overigHuishoudenCents: 72800,
      bufferOpnameCents: 5000,
      extraVrijCents: 2000,
    })

    expect(result.potjesBudget).toBe(57000)
    expect(result.sparen).toBe(35000)
    expect(result.lastenMnd).toBe(200400)
    // 410000 - 143400 - 35000 - 57000 - 72800 + 5000 + 2000
    expect(result.vrij).toBe(108800)
  })

  it('defaults every optional contribution to 0', () => {
    const result = computeWaterfall({
      incomeSources: [{ amountCents: 100000, countsTowardBase: true }],
      subscriptions: [],
      fixedCosts: [],
      envelopes: [],
      goals: [],
    })

    expect(result.vrij).toBe(100000)
  })

  it('applies a Minder scenario: income drop, envelope shrink and a paused investing contribution', () => {
    const result = computeWaterfall({
      incomeSources: [{ amountCents: 410000, countsTowardBase: true }],
      subscriptions: [],
      fixedCosts: [],
      envelopes: [{ budgetCents: 30000 }],
      goals: [],
      investingMonthlyCents: 30000,
      investingPausedThisMonth: true,
      incomeDropCents: 34000,
      potjesKrimpCents: 20000,
      bufferOpnameCents: 34000,
    })

    expect(result.basis).toBe(376000) // 410000 - 34000
    expect(result.sparen).toBe(0) // investing paused, nothing else contributing
    expect(result.potjesBudget).toBe(10000) // 30000 - 20000
    // 376000 - 0 - 0 - 10000 + 34000 (bufferOpname fully covers the drop)
    expect(result.vrij).toBe(400000)
  })

  it('never lets potjesKrimp push potjesBudget below 0', () => {
    const result = computeWaterfall({
      incomeSources: [],
      subscriptions: [],
      fixedCosts: [],
      envelopes: [{ budgetCents: 5000 }],
      goals: [],
      potjesKrimpCents: 20000, // more krimp than there is budget to shrink
    })

    expect(result.potjesBudget).toBe(0)
  })

  it('keeps meevaller based on the un-dropped basis', () => {
    const result = computeWaterfall({
      incomeSources: [
        { amountCents: 300000, countsTowardBase: true },
        { amountCents: 50000, countsTowardBase: false },
      ],
      subscriptions: [],
      fixedCosts: [],
      envelopes: [],
      goals: [],
      incomeDropCents: 10000,
    })

    expect(result.meevaller).toBe(50000)
    expect(result.basis).toBe(290000)
  })
})
