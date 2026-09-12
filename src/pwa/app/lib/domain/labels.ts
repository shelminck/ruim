import type { Transaction } from './types'

export interface EnvelopeBreakdownEntry {
  envelopeId: string | null
  amountCents: number
}

export interface LabelStats {
  /** Average per-month spend, across every distinct month this label has transactions in. */
  monthlyAverageCents: number
  yearlyCents: number
  byEnvelope: EnvelopeBreakdownEntry[]
}

/**
 * Cross-envelope cost of a label, derived purely from the transactions that
 * carry it — no separate "average" is stored anywhere. Only outgoing money
 * counts (matches how envelope "spent" is computed).
 */
export function computeLabelStats(
  labelId: string,
  transactions: Pick<Transaction, 'labelIds' | 'amountCents' | 'bookedAt' | 'envelopeId'>[],
): LabelStats {
  const labelTransactions = transactions.filter((t) => t.labelIds.includes(labelId) && t.amountCents < 0)

  const totalCents = labelTransactions.reduce((sum, t) => sum + -t.amountCents, 0)
  const distinctMonths = new Set(labelTransactions.map((t) => t.bookedAt.slice(0, 7)))
  const monthCount = Math.max(1, distinctMonths.size)
  const monthlyAverageCents = Math.round(totalCents / monthCount)

  const byEnvelopeMap = new Map<string | null, number>()
  for (const t of labelTransactions) {
    byEnvelopeMap.set(t.envelopeId, (byEnvelopeMap.get(t.envelopeId) ?? 0) + -t.amountCents)
  }
  const byEnvelope = [...byEnvelopeMap.entries()]
    .map(([envelopeId, amountCents]) => ({ envelopeId, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)

  return { monthlyAverageCents, yearlyCents: monthlyAverageCents * 12, byEnvelope }
}
