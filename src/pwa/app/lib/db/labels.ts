import { getDb } from './client'
import type { Label } from '../domain/types'

export async function listLabels(): Promise<Label[]> {
  const db = await getDb()
  return db.getAll('labels')
}
