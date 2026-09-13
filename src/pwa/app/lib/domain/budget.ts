import type { Envelope, Transaction } from './types'

export type Stand = 'ruim' | 'krap' | 'op'

/** The merkteken thresholds — spent ÷ budget-incl-carried-over. See design handoff README, "The merkteken". */
export function standForRatio(ratio: number): Stand {
  if (ratio >= 1) return 'op'
  if (ratio > 0.75) return 'krap'
  return 'ruim'
}

export function currentMonthKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7) // 'YYYY-MM'
}

/** Money spent (positive cents) from an envelope's transactions within a given month. */
export function spentCentsForEnvelope(
  transactions: Pick<Transaction, 'envelopeId' | 'bookedAt' | 'amountCents'>[],
  envelopeId: string,
  month: string,
): number {
  return transactions
    .filter((t) => t.envelopeId === envelopeId && t.bookedAt.startsWith(month) && t.amountCents < 0)
    .reduce((sum, t) => sum + -t.amountCents, 0)
}

/** Money spent (positive cents) across all transactions booked on a given day — the header's "Vandaag" pill. */
export function spentCentsForDay(
  transactions: Pick<Transaction, 'bookedAt' | 'amountCents'>[],
  day: string,
): number {
  return transactions
    .filter((t) => t.bookedAt.startsWith(day) && t.amountCents < 0)
    .reduce((sum, t) => sum + -t.amountCents, 0)
}

export function effectiveBudgetCents(envelope: Pick<Envelope, 'budgetCents' | 'carriedOverCents'>): number {
  return envelope.budgetCents + envelope.carriedOverCents
}

export interface EnvelopeProgress {
  spentCents: number
  effectiveBudgetCents: number
  remainingCents: number
  ratio: number
  stand: Stand
}

export function envelopeProgress(
  envelope: Pick<Envelope, 'budgetCents' | 'carriedOverCents'>,
  spentCents: number,
): EnvelopeProgress {
  const budget = effectiveBudgetCents(envelope)
  const ratio = budget > 0 ? spentCents / budget : spentCents > 0 ? Infinity : 0
  return {
    spentCents,
    effectiveBudgetCents: budget,
    remainingCents: budget - spentCents,
    ratio,
    stand: standForRatio(ratio),
  }
}

/**
 * "Samen nog in je potjes" on the Potjes overview — each envelope's remaining
 * amount floors at 0 before summing, so an overspent envelope doesn't drag
 * the total negative. Distinct from aggregateProgress, which sums the raw
 * remaining (needed there for the month-level merkteken ratio to stay
 * accurate). See design handoff, Prototype Ruim Desktop.dc.html:1080
 * (`Math.max(0, p.budget + p.mee - p.besteed)`).
 */
export function totalRemainingClampedCents(progresses: Pick<EnvelopeProgress, 'remainingCents'>[]): number {
  return progresses.reduce((sum, p) => sum + Math.max(0, p.remainingCents), 0)
}

/** Aggregate progress across every envelope — used for the month-level merkteken. */
export function aggregateProgress(progresses: EnvelopeProgress[]): EnvelopeProgress {
  const spentCents = progresses.reduce((sum, p) => sum + p.spentCents, 0)
  const effectiveBudget = progresses.reduce((sum, p) => sum + p.effectiveBudgetCents, 0)
  const ratio = effectiveBudget > 0 ? spentCents / effectiveBudget : spentCents > 0 ? Infinity : 0
  return {
    spentCents,
    effectiveBudgetCents: effectiveBudget,
    remainingCents: effectiveBudget - spentCents,
    ratio,
    stand: standForRatio(ratio),
  }
}
