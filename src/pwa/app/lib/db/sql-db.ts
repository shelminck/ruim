import type { Database } from 'sql.js'
import { STORE_DEFS, type StoreDef } from './sql-store-config'
import type { RuimDB } from './schema'

type StoreName = keyof RuimDB & string
type StoreValue<N extends StoreName> = RuimDB[N]['value']
type StoreKey<N extends StoreName> = RuimDB[N]['key']
type StoreIndexes<N extends StoreName> = RuimDB[N] extends { indexes: infer I } ? I : never
type IndexKey<N extends StoreName, I extends keyof StoreIndexes<N>> = StoreIndexes<N>[I]

const DEFS_BY_NAME = new Map(STORE_DEFS.map((def) => [def.name, def]))

function defFor(name: string): StoreDef {
  const def = DEFS_BY_NAME.get(name)
  if (!def) throw new Error(`Unknown store '${name}'`)
  return def
}

function indexFor(def: StoreDef, indexName: string) {
  const index = def.indexes.find((i) => i.name === indexName)
  if (!index) throw new Error(`Unknown index '${indexName}' on store '${def.name}'`)
  return index
}

function readRow(sqlDb: Database, def: StoreDef, whereSql: string, params: unknown[]): unknown | undefined {
  const stmt = sqlDb.prepare(`SELECT data FROM ${def.name} WHERE ${whereSql}`)
  try {
    stmt.bind(params as never)
    return stmt.step() ? JSON.parse(stmt.getAsObject().data as string) : undefined
  } finally {
    stmt.free()
  }
}

function readRows(sqlDb: Database, def: StoreDef, whereSql: string, params: unknown[]): unknown[] {
  const stmt = sqlDb.prepare(`SELECT data FROM ${def.name}${whereSql ? ` WHERE ${whereSql}` : ''}`)
  const results: unknown[] = []
  try {
    stmt.bind(params as never)
    while (stmt.step()) results.push(JSON.parse(stmt.getAsObject().data as string))
    return results
  } finally {
    stmt.free()
  }
}

function readKeys(sqlDb: Database, def: StoreDef, whereSql: string, params: unknown[]): unknown[] {
  const stmt = sqlDb.prepare(`SELECT ${def.keyPath} FROM ${def.name}${whereSql ? ` WHERE ${whereSql}` : ''}`)
  const results: unknown[] = []
  try {
    stmt.bind(params as never)
    while (stmt.step()) results.push(stmt.getAsObject()[def.keyPath])
    return results
  } finally {
    stmt.free()
  }
}

function writeRow(sqlDb: Database, def: StoreDef, value: Record<string, unknown>): void {
  const keyValue = value[def.keyPath]
  if (keyValue == null) throw new Error(`Missing keyPath '${def.keyPath}' on value for store '${def.name}'`)
  const columns = [def.keyPath, 'data', ...def.extraColumns]
  const updateSet = [...def.extraColumns, 'data'].map((c) => `${c} = excluded.${c}`).join(', ')
  const params = [keyValue, JSON.stringify(value), ...def.extraColumns.map((c) => value[c] ?? null)]
  sqlDb.run(
    `INSERT INTO ${def.name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
     ON CONFLICT(${def.keyPath}) DO UPDATE SET ${updateSet}`,
    params as never,
  )
}

function deleteRow(sqlDb: Database, def: StoreDef, key: unknown): void {
  sqlDb.run(`DELETE FROM ${def.name} WHERE ${def.keyPath} = ?`, [key] as never)
}

function indexWhere(index: { columns: string[] }, key: unknown): { whereSql: string; params: unknown[] } {
  const keyValues = Array.isArray(key) ? key : [key]
  return { whereSql: index.columns.map((c) => `${c} = ?`).join(' AND '), params: keyValues }
}

interface IndexProxy {
  get(key: unknown): Promise<unknown>
  getAll(key: unknown): Promise<unknown[]>
}

export interface StoreProxy<N extends StoreName = StoreName> {
  get(key: StoreKey<N>): Promise<StoreValue<N> | undefined>
  getAll(): Promise<StoreValue<N>[]>
  put(value: StoreValue<N>): Promise<StoreKey<N>>
  delete(key: StoreKey<N>): Promise<void>
  index<I extends keyof StoreIndexes<N> & string>(name: I): IndexProxy
}

function makeStoreProxy<N extends StoreName>(sqlDb: Database, name: N): StoreProxy<N> {
  const def = defFor(name)
  return {
    async get(key) {
      return readRow(sqlDb, def, `${def.keyPath} = ?`, [key]) as StoreValue<N> | undefined
    },
    async getAll() {
      return readRows(sqlDb, def, '', []) as StoreValue<N>[]
    },
    async put(value) {
      const record = value as unknown as Record<string, unknown>
      writeRow(sqlDb, def, record)
      return record[def.keyPath] as StoreKey<N>
    },
    async delete(key) {
      deleteRow(sqlDb, def, key)
    },
    index(indexName) {
      const index = indexFor(def, indexName)
      return {
        async get(key) {
          const { whereSql, params } = indexWhere(index, key)
          return readRow(sqlDb, def, whereSql, params)
        },
        async getAll(key) {
          const { whereSql, params } = indexWhere(index, key)
          return readRows(sqlDb, def, whereSql, params)
        },
      }
    },
  }
}

export interface SqlTransaction<N extends StoreName = StoreName> {
  objectStore<S extends N>(name: S): StoreProxy<S>
  readonly store: StoreProxy<N>
  readonly done: Promise<void>
}

/**
 * Serializes all write activity against the single shared sql.js connection.
 * sql.js has no real concurrency of its own (synchronous, in-memory, no
 * separate I/O thread) — unlike real IndexedDB transactions, nothing stops
 * two overlapping BEGIN/COMMIT pairs from interleaving unless we do it
 * ourselves. Reads aren't queued: they're safe to interleave since nothing
 * here does partial/uncommitted writes across an await boundary.
 */
class WriteQueue {
  private tail: Promise<void> = Promise.resolve()

  /** Runs `work` after all previously queued write work has settled, queuing after it in turn. */
  enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = this.tail.then(work, work)
    this.tail = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }
}

export class SqlDb {
  private writeQueue = new WriteQueue()

  constructor(
    private sqlDb: Database,
    private persist: () => Promise<void>,
  ) {}

  async get<N extends StoreName>(name: N, key: StoreKey<N>): Promise<StoreValue<N> | undefined> {
    return makeStoreProxy<N>(this.sqlDb, name).get(key)
  }

  async getAll<N extends StoreName>(name: N): Promise<StoreValue<N>[]> {
    return makeStoreProxy<N>(this.sqlDb, name).getAll()
  }

  async getAllFromIndex<N extends StoreName, I extends keyof StoreIndexes<N> & string>(
    name: N,
    indexName: I,
    key: IndexKey<N, I>,
  ): Promise<StoreValue<N>[]> {
    return makeStoreProxy<N>(this.sqlDb, name).index(indexName).getAll(key) as Promise<StoreValue<N>[]>
  }

  async getAllKeysFromIndex<N extends StoreName, I extends keyof StoreIndexes<N> & string>(
    name: N,
    indexName: I,
    key: IndexKey<N, I>,
  ): Promise<StoreKey<N>[]> {
    const def = defFor(name)
    const index = indexFor(def, indexName)
    const { whereSql, params } = indexWhere(index, key)
    return readKeys(this.sqlDb, def, whereSql, params) as StoreKey<N>[]
  }

  async put<N extends StoreName>(name: N, value: StoreValue<N>): Promise<StoreKey<N>> {
    return this.writeQueue.enqueue(async () => {
      const key = await makeStoreProxy<N>(this.sqlDb, name).put(value)
      await this.persist()
      return key
    })
  }

  async delete<N extends StoreName>(name: N, key: StoreKey<N>): Promise<void> {
    return this.writeQueue.enqueue(async () => {
      await makeStoreProxy<N>(this.sqlDb, name).delete(key)
      await this.persist()
    })
  }

  transaction<N extends StoreName>(storeNames: N | N[], mode: 'readonly' | 'readwrite'): SqlTransaction<N> {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    const sqlDb = this.sqlDb
    const persist = this.persist

    let began = false
    let failed = false
    function beginOnce() {
      if (!began) {
        sqlDb.run('BEGIN')
        began = true
      }
    }

    // Two separate signals, not one: `turnStarted` fires as soon as this
    // transaction reaches the front of the write queue (operations may then
    // run), while `releaseSlot` — called from done() or from an operation's
    // failure below — is what lets the *next* queued transaction start.
    // Collapsing these into a single promise deadlocks: operations would be
    // waiting on the same promise that only done() can resolve, and done()
    // is only reached after the operations that are stuck waiting for it.
    let turnStarted: () => void = () => {}
    const myTurn = new Promise<void>((resolve) => {
      turnStarted = resolve
    })
    let releaseSlot: () => void = () => {}
    void this.writeQueue.enqueue(() => {
      turnStarted()
      return new Promise<void>((resolve) => {
        releaseSlot = resolve
      })
    })

    /** If an operation throws before the caller ever reaches tx.done, roll back and free the queue ourselves — otherwise every later DB call hangs forever waiting for a slot nothing will release. */
    function abort(e: unknown): never {
      if (!failed) {
        failed = true
        if (began) sqlDb.run('ROLLBACK')
        releaseSlot()
      }
      throw e
    }

    async function guarded<T>(fn: () => Promise<T>): Promise<T> {
      await myTurn
      if (failed) throw new Error(`Transaction on [${names.join(', ')}] already failed`)
      try {
        beginOnce()
        return await fn()
      } catch (e) {
        abort(e)
      }
    }

    function guardedProxy<S extends N>(name: S): StoreProxy<S> {
      const real = makeStoreProxy<S>(sqlDb, name)
      return {
        get: (key) => guarded(() => real.get(key)),
        getAll: () => guarded(() => real.getAll()),
        put: (value) => guarded(() => real.put(value)),
        delete: (key) => guarded(() => real.delete(key)),
        index: (indexName) => {
          const proxied = real.index(indexName)
          return {
            get: (key) => guarded(() => proxied.get(key)),
            getAll: (key) => guarded(() => proxied.getAll(key)),
          }
        },
      }
    }

    return {
      objectStore(name) {
        return guardedProxy(name)
      },
      get store() {
        if (names.length !== 1) throw new Error('tx.store requires a single-store transaction')
        return guardedProxy(names[0]!)
      },
      get done() {
        return (async () => {
          await myTurn
          if (failed) return // already rolled back and released by abort()
          try {
            beginOnce()
            sqlDb.run('COMMIT')
            if (mode === 'readwrite') await persist()
          } catch (e) {
            if (began) sqlDb.run('ROLLBACK')
            throw e
          } finally {
            releaseSlot()
          }
        })()
      },
    }
  }
}
