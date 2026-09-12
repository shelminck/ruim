import { computeWaterfall, type WaterfallResult } from '../lib/domain/waterfall'
import { getDb } from '../lib/db/client'

export async function loadWaterfall(): Promise<WaterfallResult> {
  const db = await getDb()
  const [incomeSources, subscriptions, fixedCosts, envelopes, goals] = await Promise.all([
    db.getAll('incomeSources'),
    db.getAll('subscriptions'),
    db.getAll('fixedCosts'),
    db.getAll('envelopes'),
    db.getAll('goals'),
  ])

  return computeWaterfall({ incomeSources, subscriptions, fixedCosts, envelopes, goals })
}
