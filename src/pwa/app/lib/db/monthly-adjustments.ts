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
    extraBufferCents: 0,
    extraBelegCents: 0,
  }
}

export async function getMonthlyAdjustment(month: string): Promise<MonthlyAdjustment> {
  const db = await getDb()
  const found = await db.get('monthlyAdjustments', month)
  // Merge over the defaults: IndexedDB doesn't enforce shape, so a record
  // saved before a field existed would otherwise come back with it missing.
  return { ...emptyAdjustment(month), ...found }
}

export async function saveMonthlyAdjustment(adjustment: MonthlyAdjustment): Promise<void> {
  const db = await getDb()
  await db.put('monthlyAdjustments', adjustment)
}
