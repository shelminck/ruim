import type { ParsedMt940Statement } from '../mt940/parser'
import { findMatchingRule } from '../domain/rules'
import type { Transaction } from '../domain/types'
import { getDb } from './client'

export interface ImportSummary {
  importBatchId: string
  accountId: string
  found: number
  duplicates: number
  automatic: number
  toReview: number
}

/**
 * Imports a parsed MT940 statement: de-duplicates on (accountId, sequenceNumber),
 * then runs existing rules against every new transaction so only genuinely
 * unrecognized transactions land in the review queue.
 */
export async function importStatement(statement: ParsedMt940Statement): Promise<ImportSummary> {
  if (!statement.iban) {
    throw new Error('MT940-bestand bevat geen rekeningnummer (:25:)')
  }

  const db = await getDb()
  const importBatchId = crypto.randomUUID()

  const tx = db.transaction(['accounts', 'transactions', 'rules'], 'readwrite')
  const accountsStore = tx.objectStore('accounts')
  const transactionsStore = tx.objectStore('transactions')
  const rulesStore = tx.objectStore('rules')

  const existingAccounts = await accountsStore.getAll()
  let matchedAccount = existingAccounts.find((a) => a.iban === statement.iban)

  if (!matchedAccount) {
    matchedAccount = {
      id: crypto.randomUUID(),
      name: statement.iban,
      iban: statement.iban,
      lastSequenceNumber: statement.statementSequenceNumber,
    }
    await accountsStore.put(matchedAccount)
  } else {
    matchedAccount.lastSequenceNumber = statement.statementSequenceNumber
    await accountsStore.put(matchedAccount)
  }

  const accountId = matchedAccount.id
  const rules = await rulesStore.getAll()
  const dedupIndex = transactionsStore.index('byAccountSequence')

  let duplicates = 0
  let automatic = 0
  let toReview = 0

  for (const parsed of statement.transactions) {
    const existing = await dedupIndex.get([accountId, parsed.sequenceNumber])
    if (existing) {
      duplicates += 1
      continue
    }

    const matchedRule = findMatchingRule(parsed, rules)

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      accountId,
      sequenceNumber: parsed.sequenceNumber,
      importBatchId,
      bookedAt: parsed.bookedAt,
      counterparty: parsed.counterparty,
      description: parsed.description,
      amountCents: parsed.amountCents,
      envelopeId: matchedRule?.envelopeId ?? null,
      labelIds: matchedRule?.labelIds ?? [],
      ruleId: matchedRule?.id ?? null,
    }

    await transactionsStore.put(transaction)

    if (matchedRule) {
      automatic += 1
    } else {
      toReview += 1
    }
  }

  await tx.done

  return {
    importBatchId,
    accountId,
    found: statement.transactions.length,
    duplicates,
    automatic,
    toReview,
  }
}
