import type { DBSchema } from 'idb'
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

export const DB_NAME = 'ruim'
export const DB_VERSION = 4

export interface RuimDB extends DBSchema {
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
  /**
   * Legacy, unused — superseded by 'gezinsleden' (ADR 0005). Kept (not
   * deleted) because dropping an object store is a destructive local-DB
   * migration that needs explicit confirmation, not an automatic step.
   */
  household: {
    key: string
    value: unknown
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
