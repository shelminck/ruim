import { getDb } from './client'
import type { MonthlyAdjustment } from '../domain/types'

export function emptyAdjustment(month: string): MonthlyAdjustment {
  return {
    month,
    extraVrijCents: 0,
    incomeDropCents: 0,
    potjesKrimpCents: 0,
    investingPausedThisMonth: false,
    bufferOpnameCents: 0,
  }
}

export async function getMonthlyAdjustment(month: string): Promise<MonthlyAdjustment> {
  const db = await getDb()
  return (await db.get('monthlyAdjustments', month)) ?? emptyAdjustment(month)
}

export async function saveMonthlyAdjustment(adjustment: MonthlyAdjustment): Promise<void> {
  const db = await getDb()
  await db.put('monthlyAdjustments', adjustment)
}
