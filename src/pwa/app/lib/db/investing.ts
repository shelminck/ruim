import { getDb } from './client'
import type { Investing } from '../domain/types'

const DEFAULT_INVESTING: Investing = {
  id: 'investing',
  depositsSinceCents: 0,
  monthlyDepositCents: 0,
  currentValueCents: 0,
}

export async function getInvesting(): Promise<Investing> {
  const db = await getDb()
  return (await db.get('investing', 'investing')) ?? DEFAULT_INVESTING
}

export async function saveInvesting(investing: Investing): Promise<void> {
  const db = await getDb()
  await db.put('investing', investing)
}
