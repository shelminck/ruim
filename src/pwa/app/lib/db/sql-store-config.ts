/**
 * One row per RuimDB store: which column is the primary key, which extra
 * columns get pulled out of the JSON value for indexed lookups, and which
 * indexes exist on those columns. Everything else in a record lives as
 * opaque JSON in the `data` column — this app has no need for a fully
 * normalized relational schema, only for the handful of lookups the domain
 * modules already do.
 */
export interface IndexDef {
  name: string
  columns: string[]
  unique: boolean
}

export interface StoreDef {
  name: string
  keyPath: string
  extraColumns: string[]
  indexes: IndexDef[]
}

export const STORE_DEFS: StoreDef[] = [
  { name: 'accounts', keyPath: 'id', extraColumns: [], indexes: [] },
  {
    name: 'transactions',
    keyPath: 'id',
    extraColumns: ['accountId', 'sequenceNumber', 'envelopeId', 'importBatchId'],
    indexes: [
      { name: 'byAccountSequence', columns: ['accountId', 'sequenceNumber'], unique: true },
      { name: 'byEnvelope', columns: ['envelopeId'], unique: false },
      { name: 'byImportBatch', columns: ['importBatchId'], unique: false },
    ],
  },
  { name: 'envelopes', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'labels', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'rules', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'incomeSources', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'fixedCosts', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'subscriptions', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'goals', keyPath: 'id', extraColumns: [], indexes: [] },
  {
    name: 'tasks',
    keyPath: 'id',
    extraColumns: ['month'],
    indexes: [{ name: 'byMonth', columns: ['month'], unique: false }],
  },
  { name: 'gezinsleden', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'buffer', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'investing', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'monthlyAdjustments', keyPath: 'month', extraColumns: [], indexes: [] },
  { name: 'windfallPolicy', keyPath: 'id', extraColumns: [], indexes: [] },
  { name: 'securityConsentLog', keyPath: 'id', extraColumns: [], indexes: [] },
]

export function createTableSql(def: StoreDef): string[] {
  const columns = [`${def.keyPath} TEXT PRIMARY KEY`, 'data TEXT NOT NULL', ...def.extraColumns.map((c) => `${c} TEXT`)]
  const statements = [`CREATE TABLE IF NOT EXISTS ${def.name} (${columns.join(', ')})`]
  for (const index of def.indexes) {
    const unique = index.unique ? 'UNIQUE ' : ''
    statements.push(
      `CREATE ${unique}INDEX IF NOT EXISTS idx_${def.name}_${index.name} ON ${def.name} (${index.columns.join(', ')})`,
    )
  }
  return statements
}
