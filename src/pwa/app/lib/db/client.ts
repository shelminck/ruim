import { openDB, type IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION, type RuimDB } from './schema'

let dbPromise: Promise<IDBPDatabase<RuimDB>> | null = null

export function getDb(): Promise<IDBPDatabase<RuimDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RuimDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('accounts', { keyPath: 'id' })

          const transactions = db.createObjectStore('transactions', { keyPath: 'id' })
          transactions.createIndex('byAccountSequence', ['accountId', 'sequenceNumber'], {
            unique: true,
          })
          transactions.createIndex('byEnvelope', 'envelopeId')
          transactions.createIndex('byImportBatch', 'importBatchId')

          db.createObjectStore('envelopes', { keyPath: 'id' })
          db.createObjectStore('labels', { keyPath: 'id' })
          db.createObjectStore('rules', { keyPath: 'id' })
          db.createObjectStore('incomeSources', { keyPath: 'id' })
          db.createObjectStore('fixedCosts', { keyPath: 'id' })
          db.createObjectStore('subscriptions', { keyPath: 'id' })
          db.createObjectStore('goals', { keyPath: 'id' })

          const tasks = db.createObjectStore('tasks', { keyPath: 'id' })
          tasks.createIndex('byMonth', 'month')

          db.createObjectStore('household', { keyPath: 'id' })
        }

        if (oldVersion < 2) {
          db.createObjectStore('buffer', { keyPath: 'id' })
          db.createObjectStore('investing', { keyPath: 'id' })
        }

        if (oldVersion < 3) {
          db.createObjectStore('monthlyAdjustments', { keyPath: 'month' })
          db.createObjectStore('windfallPolicy', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/** Test-only: force a fresh connection (e.g. after resetting fake-indexeddb between tests). */
export function resetDbConnection(): void {
  dbPromise = null
}
