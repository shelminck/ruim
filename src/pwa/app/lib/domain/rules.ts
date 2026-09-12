import type { Rule, Transaction } from './types'

/**
 * A rule matches when every field it specifies matches the transaction.
 * A rule with no fields set at all never matches (avoids an accidental catch-all).
 */
export function findMatchingRule(
  transaction: Pick<Transaction, 'counterparty' | 'description' | 'amountCents'>,
  rules: Rule[],
): Rule | null {
  for (const rule of rules) {
    const hasAnyCriterion =
      rule.matchCounterparty !== null || rule.matchDescription !== null || rule.matchAmountCents !== null
    if (!hasAnyCriterion) continue

    const counterpartyMatches =
      rule.matchCounterparty === null ||
      transaction.counterparty.toLowerCase().includes(rule.matchCounterparty.toLowerCase())
    const descriptionMatches =
      rule.matchDescription === null ||
      transaction.description.toLowerCase().includes(rule.matchDescription.toLowerCase())
    const amountMatches = rule.matchAmountCents === null || rule.matchAmountCents === transaction.amountCents

    if (counterpartyMatches && descriptionMatches && amountMatches) {
      return rule
    }
  }

  return null
}
