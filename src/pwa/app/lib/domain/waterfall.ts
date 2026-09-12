import type { Envelope, FixedCost, Goal, IncomeSource, Subscription } from './types'

/**
 * The month's cascade: base income minus fixed costs, savings, envelope
 * budgets and other household spending — see design handoff README,
 * "Derived values" and the Waterval screen.
 *
 * Buffer/investing monthly contributions and "overig huishouden" have no
 * dedicated settings screen yet (Vooruit is build step 6) — they default to
 * 0 and are accepted as explicit inputs so callers can wire them up later
 * without reshaping this function.
 */
export interface WaterfallInput {
  incomeSources: Pick<IncomeSource, 'amountCents' | 'countsTowardBase'>[]
  subscriptions: Pick<Subscription, 'amountCents' | 'cancelledAt'>[]
  fixedCosts: Pick<FixedCost, 'amountCents'>[]
  envelopes: Pick<Envelope, 'budgetCents'>[]
  goals: Pick<Goal, 'monthlyDepositCents'>[]
  bufferMonthlyCents?: number
  investingMonthlyCents?: number
  overigHuishoudenCents?: number
  /** One-off buffer withdrawal from an accepted income-drop coverage option. */
  bufferOpnameCents?: number
  /** One-off extra free-to-spend from an allocated windfall. */
  extraVrijCents?: number
}

export interface WaterfallResult {
  binnen: number
  basis: number
  meevaller: number
  aboTotaal: number
  vasteLasten: number
  sparen: number
  potjesBudget: number
  vrij: number
  lastenMnd: number
}

export function computeWaterfall(input: WaterfallInput): WaterfallResult {
  const binnen = input.incomeSources.reduce((sum, source) => sum + source.amountCents, 0)
  const basis = input.incomeSources
    .filter((source) => source.countsTowardBase)
    .reduce((sum, source) => sum + source.amountCents, 0)
  const meevaller = Math.max(0, binnen - basis)

  const aboTotaal = input.subscriptions
    .filter((subscription) => subscription.cancelledAt === null)
    .reduce((sum, subscription) => sum + subscription.amountCents, 0)
  const fixedCostsTotal = input.fixedCosts.reduce((sum, cost) => sum + cost.amountCents, 0)
  const vasteLasten = fixedCostsTotal + aboTotaal

  const goalDeposits = input.goals.reduce((sum, goal) => sum + goal.monthlyDepositCents, 0)
  const sparen = (input.bufferMonthlyCents ?? 0) + goalDeposits + (input.investingMonthlyCents ?? 0)

  const potjesBudget = input.envelopes.reduce((sum, envelope) => sum + envelope.budgetCents, 0)

  const vrij =
    basis -
    vasteLasten -
    sparen -
    potjesBudget -
    (input.overigHuishoudenCents ?? 0) +
    (input.bufferOpnameCents ?? 0) +
    (input.extraVrijCents ?? 0)

  return {
    binnen,
    basis,
    meevaller,
    aboTotaal,
    vasteLasten,
    sparen,
    potjesBudget,
    vrij,
    lastenMnd: vasteLasten + potjesBudget,
  }
}
