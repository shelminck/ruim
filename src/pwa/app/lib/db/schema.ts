import type { DBSchema } from 'idb'
import type {
  Account,
  FixedCost,
  Goal,
  Household,
  IncomeSource,
  Label,
  Rule,
  Subscription,
  Task,
  Transaction,
} from '../domain/types'
import type { Envelope } from '../domain/types'

export const DB_NAME = 'ruim'
export const DB_VERSION = 1

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
    value: Task
    indexes: {
      byMonth: string
    }
  }
  household: {
    key: string
    value: Household
  }
}
