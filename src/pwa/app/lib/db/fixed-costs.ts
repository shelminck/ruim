import { getDb } from './client'
import type { FixedCost } from '../domain/types'

export async function listFixedCosts(): Promise<FixedCost[]> {
  const db = await getDb()
  return db.getAll('fixedCosts')
}

export interface CreateFixedCostInput {
  name: string
  group: string
  amountCents: number
}

export async function createFixedCost(input: CreateFixedCostInput): Promise<FixedCost> {
  const db = await getDb()
  const cost: FixedCost = { id: crypto.randomUUID(), ...input }
  await db.put('fixedCosts', cost)
  return cost
}

export async function removeFixedCost(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('fixedCosts', id)
}
