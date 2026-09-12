import { getDb } from './client'
import type { Account } from '../domain/types'

export async function listAccounts(): Promise<Account[]> {
  const db = await getDb()
  return db.getAll('accounts')
}
