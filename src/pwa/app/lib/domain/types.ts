/**
 * Domain model for Ruim. Mirrors the data model described in
 * docs/design/design_handoff_huishoudboekje_ruim/README.md ("Data model for a
 * real implementation") and the domain modules in CLAUDE.md.
 *
 * All money amounts are in whole eurocents (integers) to avoid floating-point
 * drift in budget arithmetic.
 */

export type Iso8601Date = string // 'YYYY-MM-DD'

export interface Account {
  id: string
  name: string
  iban: string
  /** Last bank sequence number seen for this account, used for MT940 de-duplication. */
  lastSequenceNumber: string | null
}

export interface Transaction {
  id: string
  accountId: string
  /** Bank-assigned sequence number (MT940 :28C: or similar) — de-dup key together with accountId. */
  sequenceNumber: string
  importBatchId: string
  bookedAt: Iso8601Date
  counterparty: string
  description: string
  /** Signed eurocents: positive = money in, negative = money out. */
  amountCents: number
  envelopeId: string | null
  labelIds: string[]
  /** Set once a Rule assigns this transaction; null while it sits in the review queue. */
  ruleId: string | null
}

export type RolloverPolicy =
  | 'carry-over' // schuift door naar volgende maand, max 1 maand
  | 'reset' // valt weg, elke maand schoon
  | 'to-savings-goal' // rest gaat naar een spaarpotje (savingsGoalId)

export interface Envelope {
  id: string
  name: string
  accountId: string
  budgetCents: number
  rolloverPolicy: RolloverPolicy
  /** Only used when rolloverPolicy === 'to-savings-goal'. */
  rolloverGoalId: string | null
}

export interface Label {
  id: string
  name: string
}

export interface Rule {
  id: string
  /** Match is intentionally simple: substring match on counterparty/description, exact on amount if set. */
  matchCounterparty: string | null
  matchDescription: string | null
  matchAmountCents: number | null
  envelopeId: string
  labelIds: string[]
  /** True once retroactively applied to historic transactions; enables "undo". */
  appliedRetroactively: boolean
  /** Transaction ids touched by the retroactive apply, so it can be undone. */
  retroactiveTransactionIds: string[]
  createdAt: Iso8601Date
}

export interface IncomeSource {
  id: string
  name: string
  amountCents: number
  /** Whether this source counts toward "basis" (base income) or is treated as windfall. */
  countsTowardBase: boolean
}

export interface FixedCost {
  id: string
  name: string
  group: string // e.g. 'Wonen', 'Energie & water', 'Verzekeringen', 'Bankkosten'
  amountCents: number
}

export interface Subscription {
  id: string
  name: string
  amountCents: number
  cancelledAt: Iso8601Date | null
}

export interface Goal {
  id: string
  name: string
  targetCents: number
  savedCents: number
  targetDate: Iso8601Date | null
  monthlyDepositCents: number
  pauseWhenIncomeLow: boolean
}

export type TaskGroup = 'overboeken' | 'regelen'

export interface Task {
  id: string
  group: TaskGroup
  /** Tasks are derived, not stored — this id is stable per month+source so checked state persists. */
  month: string // 'YYYY-MM'
  title: string
  amountCents: number | null
  done: boolean
  dismissed: boolean
}

export interface Household {
  id: string
  members: string[] // display names, e.g. ['Sanne', 'Mark']
}
