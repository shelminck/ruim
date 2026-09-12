import { getDb } from './client'
import type { IncomeSource } from '../domain/types'

export async function listIncomeSources(): Promise<IncomeSource[]> {
  const db = await getDb()
  return db.getAll('incomeSources')
}

export interface CreateIncomeSourceInput {
  name: string
  amountCents: number
  countsTowardBase: boolean
}

export async function createIncomeSource(input: CreateIncomeSourceInput): Promise<IncomeSource> {
  const db = await getDb()
  const source: IncomeSource = { id: crypto.randomUUID(), ...input }
  await db.put('incomeSources', source)
  return source
}

export async function updateIncomeSource(source: IncomeSource): Promise<void> {
  const db = await getDb()
  await db.put('incomeSources', source)
}

export async function removeIncomeSource(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('incomeSources', id)
}
