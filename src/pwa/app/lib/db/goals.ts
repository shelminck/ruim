import { getDb } from './client'
import type { Goal } from '../domain/types'

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb()
  return db.getAll('goals')
}

export async function getGoal(id: string): Promise<Goal | undefined> {
  const db = await getDb()
  return db.get('goals', id)
}

export interface CreateGoalInput {
  name: string
  targetCents: number
  targetDate: string | null
  monthlyDepositCents: number
  accountLabel: string
  transferDay: number
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const db = await getDb()
  const goal: Goal = {
    id: crypto.randomUUID(),
    savedCents: 0,
    pauseWhenIncomeLow: true,
    ...input,
  }
  await db.put('goals', goal)
  return goal
}

export async function updateGoal(goal: Goal): Promise<void> {
  const db = await getDb()
  await db.put('goals', goal)
}

export async function removeGoal(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('goals', id)
}
