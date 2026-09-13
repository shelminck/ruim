import type {
  Account,
  Buffer,
  FixedCost,
  Gezinslid,
  Goal,
  IncomeSource,
  Investing,
  Label,
  MonthlyAdjustment,
  Rule,
  Subscription,
  TaskState,
  Transaction,
  WindfallPolicy,
} from '../domain/types'
import type { Envelope } from '../domain/types'

/**
 * Shape of the app's data, independent of how it's persisted. Used to type
 * the sql.js-backed store access in sql-db.ts (see sql-store-config.ts for
 * how each store maps onto actual SQL tables/columns) — this file no longer
 * describes a real IndexedDB schema, just the TypeScript-facing contract.
 */
export interface RuimDB {
  accounts: {
    key: string
    value: Account
  }
  transactions: {
    key: string
    value: Transaction
    indexes: {
      byAccountSequence: [string, string] // [accountId, sequenceNumber] — de-dup
      byEnvelope: string
      byImportBatch: string
    }
  }
  envelopes: {
    key: string
    value: Envelope
  }
  labels: {
    key: string
    value: Label
  }
  rules: {
    key: string
    value: Rule
  }
  incomeSources: {
    key: string
    value: IncomeSource
  }
  fixedCosts: {
    key: string
    value: FixedCost
  }
  subscriptions: {
    key: string
    value: Subscription
  }
  goals: {
    key: string
    value: Goal
  }
  tasks: {
    key: string
    value: TaskState
    indexes: {
      byMonth: string
    }
  }
  gezinsleden: {
    key: string
    value: Gezinslid
  }
  buffer: {
    key: string
    value: Buffer
  }
  investing: {
    key: string
    value: Investing
  }
  monthlyAdjustments: {
    key: string
    value: MonthlyAdjustment
  }
  windfallPolicy: {
    key: string
    value: WindfallPolicy
  }
}
