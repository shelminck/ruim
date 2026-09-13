import initSqlJs from 'sql.js'
import { decryptBlob, encryptBlob } from '../crypto/blob-cipher'
import { getDekOnceUnlocked } from '../crypto/session'
import { readBlob, writeBlob } from './blob-store'
import { SqlDb } from './sql-db'
import { STORE_DEFS, createTableSql } from './sql-store-config'

let dbPromise: Promise<SqlDb> | null = null

async function createDb(): Promise<SqlDb> {
  const dek = await getDekOnceUnlocked()
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })

  const encryptedExisting = await readBlob()
  let existing: Uint8Array | undefined
  if (encryptedExisting) {
    try {
      existing = await decryptBlob(dek, encryptedExisting)
    } catch {
      // Wrong DEK, or a pre-encryption plaintext blob from before ADR 0005 §2
      // shipped. No users yet, so starting fresh is an accepted loss here —
      // see CLAUDE.md on destructive DB actions for why this isn't the
      // default posture once there's real data to lose.
      existing = undefined
    }
  }
  const sqlDb = existing ? new SQL.Database(existing) : new SQL.Database()

  for (const def of STORE_DEFS) {
    for (const statement of createTableSql(def)) {
      sqlDb.run(statement)
    }
  }

  async function persist(): Promise<void> {
    await writeBlob(await encryptBlob(dek, sqlDb.export()))
  }

  // A fresh database has nothing to export yet — write it once up front so a
  // reload before any write still finds the (empty but table-shaped) blob.
  if (!existing) await persist()

  return new SqlDb(sqlDb, persist)
}

export function getDb(): Promise<SqlDb> {
  if (!dbPromise) {
    dbPromise = createDb()
  }
  return dbPromise
}

/** Test-only: force a fresh connection (e.g. after resetting fake-indexeddb between tests). */
export function resetDbConnection(): void {
  dbPromise = null
}
