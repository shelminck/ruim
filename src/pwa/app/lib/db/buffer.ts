import { getDb } from './client'
import type { Buffer } from '../domain/types'

const DEFAULT_BUFFER: Buffer = { id: 'buffer', savedCents: 0, monthlyContributionCents: 0 }

export async function getBuffer(): Promise<Buffer> {
  const db = await getDb()
  return (await db.get('buffer', 'buffer')) ?? DEFAULT_BUFFER
}

export async function saveBuffer(buffer: Buffer): Promise<void> {
  const db = await getDb()
  await db.put('buffer', buffer)
}
