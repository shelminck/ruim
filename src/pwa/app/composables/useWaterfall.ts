import { computeWaterfall, type WaterfallResult } from '../lib/domain/waterfall'
import { getDb } from '../lib/db/client'
import { getBuffer } from '../lib/db/buffer'
import { getInvesting } from '../lib/db/investing'
import { currentMonthKey } from '../lib/domain/budget'
import { getMonthlyAdjustment } from '../lib/db/monthly-adjustments'

export async function loadWaterfall(): Promise<WaterfallResult> {
  const db = await getDb()
  const [incomeSources, subscriptions, fixedCosts, envelopes, goals, buffer, investing, adjustment] =
    await Promise.all([
      db.getAll('incomeSources'),
      db.getAll('subscriptions'),
      db.getAll('fixedCosts'),
      db.getAll('envelopes'),
      db.getAll('goals'),
      getBuffer(),
      getInvesting(),
      getMonthlyAdjustment(currentMonthKey()),
    ])

  return computeWaterfall({
    incomeSources,
    subscriptions,
    fixedCosts,
    envelopes,
    goals,
    bufferMonthlyCents: buffer.monthlyContributionCents,
    investingMonthlyCents: investing.monthlyDepositCents,
    extraVrijCents: adjustment.extraVrijCents,
    incomeDropCents: adjustment.incomeDropCents,
    potjesKrimpCents: adjustment.potjesKrimpCents,
    investingPausedThisMonth: adjustment.investingPausedThisMonth,
    bufferOpnameCents: adjustment.bufferOpnameCents,
  })
}
