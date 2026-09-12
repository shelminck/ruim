import { getDb } from './client'
import type { WindfallPolicy } from '../domain/types'

export async function getWindfallPolicy(): Promise<WindfallPolicy | undefined> {
  const db = await getDb()
  return db.get('windfallPolicy', 'windfallPolicy')
}

export async function saveWindfallPolicy(policy: WindfallPolicy): Promise<void> {
  const db = await getDb()
  await db.put('windfallPolicy', policy)
}
