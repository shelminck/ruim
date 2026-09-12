import type { Transaction } from './types'

export interface EnvelopeGuess {
  envelopeId: string
  confidencePercent: number
}

/**
 * Guesses an envelope for an unassigned transaction from how the same
 * counterparty was categorized before — no ML, just frequency. See
 * CLAUDE.md's Categorization module: "regelgebaseerde matching... met
 * confidence score".
 */
export function guessEnvelopeForTransaction(
  transaction: Pick<Transaction, 'counterparty'>,
  categorizedTransactions: Pick<Transaction, 'counterparty' | 'envelopeId'>[],
): EnvelopeGuess | null {
  const name = transaction.counterparty.toLowerCase()
  const matches = categorizedTransactions.filter(
    (t) => t.envelopeId !== null && t.counterparty.toLowerCase() === name,
  )
  if (matches.length === 0) return null

  const counts = new Map<string, number>()
  for (const match of matches) {
    const envelopeId = match.envelopeId!
    counts.set(envelopeId, (counts.get(envelopeId) ?? 0) + 1)
  }

  let bestEnvelopeId = matches[0]!.envelopeId!
  let bestCount = 0
  for (const [envelopeId, count] of counts) {
    if (count > bestCount) {
      bestEnvelopeId = envelopeId
      bestCount = count
    }
  }

  return { envelopeId: bestEnvelopeId, confidencePercent: Math.round((bestCount / matches.length) * 100) }
}

/** Other unassigned transactions a new rule for this counterparty would also touch. */
export function findRetroactiveCandidates(
  transaction: Pick<Transaction, 'id' | 'counterparty'>,
  unassignedTransactions: Pick<Transaction, 'id' | 'counterparty'>[],
): Pick<Transaction, 'id' | 'counterparty'>[] {
  const name = transaction.counterparty.toLowerCase()
  return unassignedTransactions.filter((t) => t.id !== transaction.id && t.counterparty.toLowerCase() === name)
}
