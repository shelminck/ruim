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
  /**
   * Rest carried over from last month, applied by the (not yet built) "Nieuwe
   * maand" rollover action per the envelope's rolloverPolicy. Stored because
   * it's a discrete monthly decision, not something derivable from live data.
   * The *remaining* budget (budget + carriedOver − spent) stays computed, never stored.
   */
  carriedOverCents: number
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
  /** Free text, e.g. "Spaarrekening · NL··8842" — where the money physically sits. */
  accountLabel: string
  /** Day of the month the automatic transfer happens, e.g. 26. */
  transferDay: number
}

/** Singleton settings record (id is always 'buffer') — the emergency buffer, priority 1 in Vooruit. */
export interface Buffer {
  id: 'buffer'
  savedCents: number
  monthlyContributionCents: number
}

/**
 * Singleton settings record (id is always 'investing') — priority 3 in Vooruit.
 * currentValueCents is informational only: Ruim budgets on deposits, never market value.
 */
export interface Investing {
  id: 'investing'
  depositsSinceCents: number
  monthlyDepositCents: number
  currentValueCents: number
}

/**
 * One-off, per-month overlays on the waterfall — the lasting effects of
 * applying a Meevaller allocation or a Minder (income-drop) coverage plan.
 * Everything defaults to 0/false; absent = a normal month.
 */
export interface MonthlyAdjustment {
  month: string // 'YYYY-MM', also the keyPath
  /** From Meevaller: the part of the windfall added to this month's free-to-spend, once. */
  extraVrijCents: number
  /** From Minder: how much lower the base income is this month. */
  incomeDropCents: number
  /** From Minder: how much envelope budgets shrink this month, in aggregate. */
  potjesKrimpCents: number
  /** From Minder: investing's monthly deposit is skipped this month. */
  investingPausedThisMonth: boolean
  /** From Minder: one-off withdrawal from the buffer to cover the gap. */
  bufferOpnameCents: number
  /** From Meevaller: the part of the windfall added to the buffer, once — for the Te doen transfer task. */
  extraBufferCents: number
  /** From Meevaller: the part of the windfall added to investing, once — for the Te doen transfer task. */
  extraBelegCents: number
}

/** Singleton (id is always 'windfallPolicy') — the saved default split for "elke meevaller zo verdelen". */
export interface WindfallPolicy {
  id: 'windfallPolicy'
  bufferPct: number
  investingPct: number
}

export type TaskGroup = 'overboeken' | 'regelen'

/**
 * Tasks themselves are derived (see lib/domain/tasks.ts), never stored — only
 * the checked/dismissed state persists, keyed by the derived task's stable id
 * (which embeds the month, so a new month naturally starts unchecked).
 */
export interface TaskState {
  id: string
  month: string // 'YYYY-MM'
  done: boolean
  dismissed: boolean
}

export interface Household {
  id: string
  members: string[] // display names, e.g. ['Sanne', 'Mark']
}
