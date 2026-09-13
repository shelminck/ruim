import { openDB, type IDBPDatabase } from 'idb'

const BLOB_DB_NAME = 'ruim-sqlite'
const BLOB_STORE = 'blob'
const BLOB_KEY = 'db'

/**
 * The only remaining use of raw IndexedDB in this app: a single opaque byte
 * blob (the exported sql.js database), not a data model of its own. Every
 * domain record lives inside that blob, not as separate IndexedDB records —
 * see ADR 0005 §2, which wraps exactly this blob in encryption-at-rest.
 */
let blobDbPromise: Promise<IDBPDatabase> | null = null

function openBlobDb(): Promise<IDBPDatabase> {
  if (!blobDbPromise) {
    blobDbPromise = openDB(BLOB_DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(BLOB_STORE)
      },
    })
  }
  return blobDbPromise
}

export async function readBlob(): Promise<Uint8Array | undefined> {
  const db = await openBlobDb()
  return db.get(BLOB_STORE, BLOB_KEY)
}

export async function writeBlob(bytes: Uint8Array): Promise<void> {
  const db = await openBlobDb()
  await db.put(BLOB_STORE, bytes, BLOB_KEY)
}

/** Test-only: force a fresh connection (e.g. after resetting fake-indexeddb between tests). */
export function resetBlobDbConnection(): void {
  blobDbPromise = null
}
