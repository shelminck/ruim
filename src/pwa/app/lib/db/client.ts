import initSqlJs from 'sql.js'
import { readBlob, writeBlob } from './blob-store'
import { SqlDb } from './sql-db'
import { STORE_DEFS, createTableSql } from './sql-store-config'

let dbPromise: Promise<SqlDb> | null = null

async function createDb(): Promise<SqlDb> {
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  const existing = await readBlob()
  const sqlDb = existing ? new SQL.Database(existing) : new SQL.Database()

  for (const def of STORE_DEFS) {
    for (const statement of createTableSql(def)) {
      sqlDb.run(statement)
    }
  }

  async function persist(): Promise<void> {
    await writeBlob(sqlDb.export())
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
