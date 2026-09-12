import { getDb } from '../lib/db/client'

const count = ref(0)

/**
 * Number of transactions still waiting for an envelope (the Nakijken queue).
 * IndexedDB indexes can't key on `null`, so this counts by scanning — fine at
 * household scale (hundreds to low thousands of transactions).
 */
export function useNakijkenCount() {
  async function refresh() {
    const db = await getDb()
    const all = await db.getAll('transactions')
    count.value = all.filter((transaction) => transaction.envelopeId === null).length
  }

  return { count: readonly(count), refresh }
}
