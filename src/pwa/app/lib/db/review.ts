import { getDb } from './client'
import type { Rule, Transaction } from '../domain/types'

export interface ConfirmOptions {
  transactionId: string
  envelopeId: string
  labelIds: string[]
  createRule: boolean
}

/** Assigns one transaction, optionally laying a rule underneath it (not applied retroactively yet). */
export async function confirmTransaction(options: ConfirmOptions): Promise<void> {
  // IndexedDB's structured clone can't serialize Vue's reactive Proxy wrappers —
  // spreading into a plain array/object strips that before anything is put().
  const labelIds = [...options.labelIds]

  const db = await getDb()
  const tx = db.transaction(['transactions', 'rules'], 'readwrite')
  const transactionsStore = tx.objectStore('transactions')
  const rulesStore = tx.objectStore('rules')

  const transaction = await transactionsStore.get(options.transactionId)
  if (!transaction) throw new Error('Transactie niet gevonden')

  let ruleId: string | null = null
  if (options.createRule) {
    const rule: Rule = {
      id: crypto.randomUUID(),
      matchCounterparty: transaction.counterparty,
      matchDescription: null,
      matchAmountCents: null,
      envelopeId: options.envelopeId,
      labelIds,
      appliedRetroactively: false,
      retroactiveTransactionIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
    }
    await rulesStore.put(rule)
    ruleId = rule.id
  }

  await transactionsStore.put({
    ...transaction,
    envelopeId: options.envelopeId,
    labelIds,
    ruleId,
  })

  await tx.done
}

export interface BulkApplyOptions extends ConfirmOptions {
  candidateTransactionIds: string[]
}

/** Confirms the current transaction and sweeps every candidate into the same envelope under one new rule. Returns the rule id, for undo. */
export async function confirmWithBulkApply(options: BulkApplyOptions): Promise<string> {
  // See the note in confirmTransaction: strip Vue reactivity before IndexedDB sees it.
  const labelIds = [...options.labelIds]
  const candidateTransactionIds = [...options.candidateTransactionIds]

  const db = await getDb()
  const tx = db.transaction(['transactions', 'rules'], 'readwrite')
  const transactionsStore = tx.objectStore('transactions')
  const rulesStore = tx.objectStore('rules')

  const transaction = await transactionsStore.get(options.transactionId)
  if (!transaction) throw new Error('Transactie niet gevonden')

  const rule: Rule = {
    id: crypto.randomUUID(),
    matchCounterparty: transaction.counterparty,
    matchDescription: null,
    matchAmountCents: null,
    envelopeId: options.envelopeId,
    labelIds,
    appliedRetroactively: true,
    retroactiveTransactionIds: candidateTransactionIds,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  await rulesStore.put(rule)

  await transactionsStore.put({
    ...transaction,
    envelopeId: options.envelopeId,
    labelIds,
    ruleId: rule.id,
  })

  for (const candidateId of candidateTransactionIds) {
    const candidate = await transactionsStore.get(candidateId)
    if (!candidate) continue
    await transactionsStore.put({ ...candidate, envelopeId: options.envelopeId, labelIds, ruleId: rule.id })
  }

  await tx.done
  return rule.id
}

/** Reverts a rule's retroactive sweep: the touched transactions go back to unassigned, the rule stays for future imports. */
export async function undoRetroactiveApply(ruleId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['transactions', 'rules'], 'readwrite')
  const transactionsStore = tx.objectStore('transactions')
  const rulesStore = tx.objectStore('rules')

  const rule = await rulesStore.get(ruleId)
  if (!rule) return

  for (const transactionId of rule.retroactiveTransactionIds) {
    const transaction = await transactionsStore.get(transactionId)
    if (!transaction || transaction.ruleId !== ruleId) continue
    await transactionsStore.put({ ...transaction, envelopeId: null, labelIds: [], ruleId: null } satisfies Transaction)
  }

  await rulesStore.put({ ...rule, appliedRetroactively: false, retroactiveTransactionIds: [] })
  await tx.done
}
