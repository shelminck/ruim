import { computeWaterfall, type WaterfallResult } from '../lib/domain/waterfall'
import { getDb } from '../lib/db/client'
import { getBuffer } from '../lib/db/buffer'
import { getInvesting } from '../lib/db/investing'

export async function loadWaterfall(): Promise<WaterfallResult> {
  const db = await getDb()
  const [incomeSources, subscriptions, fixedCosts, envelopes, goals, buffer, investing] = await Promise.all([
    db.getAll('incomeSources'),
    db.getAll('subscriptions'),
    db.getAll('fixedCosts'),
    db.getAll('envelopes'),
    db.getAll('goals'),
    getBuffer(),
    getInvesting(),
  ])

  return computeWaterfall({
    incomeSources,
    subscriptions,
    fixedCosts,
    envelopes,
    goals,
    bufferMonthlyCents: buffer.monthlyContributionCents,
    investingMonthlyCents: investing.monthlyDepositCents,
  })
}
