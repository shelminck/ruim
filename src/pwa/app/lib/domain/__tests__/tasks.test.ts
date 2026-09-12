import { describe, expect, it } from 'vitest'
import { deriveTasks } from '../tasks'
import { emptyAdjustment } from '../../db/monthly-adjustments'

const baseInput = {
  month: '2026-09',
  buffer: { monthlyContributionCents: 0 },
  investing: { monthlyDepositCents: 0 },
  goals: [],
  subscriptions: [],
  adjustment: emptyAdjustment('2026-09'),
  reviewQueueCount: 0,
}

describe('deriveTasks', () => {
  it('produces no tasks for a completely empty month', () => {
    expect(deriveTasks(baseInput)).toHaveLength(0)
  })

  it('adds a buffer top-up task when there is a monthly contribution', () => {
    const tasks = deriveTasks({ ...baseInput, buffer: { monthlyContributionCents: 25000 } })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ id: 'buffer-topup:2026-09', group: 'overboeken', amountCents: 25000 })
  })

  it('skips a goal deposit when income is low and the goal pauses for it', () => {
    const tasks = deriveTasks({
      ...baseInput,
      goals: [{ id: 'g1', name: 'Vakantie', monthlyDepositCents: 15000, transferDay: 26, pauseWhenIncomeLow: true }],
      adjustment: { ...emptyAdjustment('2026-09'), incomeDropCents: 34000 },
    })
    expect(tasks).toHaveLength(0)
  })

  it('keeps a goal deposit during an income drop when the goal does not pause', () => {
    const tasks = deriveTasks({
      ...baseInput,
      goals: [{ id: 'g1', name: 'Vakantie', monthlyDepositCents: 15000, transferDay: 26, pauseWhenIncomeLow: false }],
      adjustment: { ...emptyAdjustment('2026-09'), incomeDropCents: 34000 },
    })
    expect(tasks).toHaveLength(1)
  })

  it('skips the investing task when paused this month', () => {
    const tasks = deriveTasks({
      ...baseInput,
      investing: { monthlyDepositCents: 30000 },
      adjustment: { ...emptyAdjustment('2026-09'), investingPausedThisMonth: true },
    })
    expect(tasks.find((t) => t.id.startsWith('investing-deposit'))).toBeUndefined()
    expect(tasks.find((t) => t.id.startsWith('investing-pause-arrange'))).toBeDefined()
  })

  it('adds a reverse buffer-withdrawal task when Minder used the buffer', () => {
    const tasks = deriveTasks({
      ...baseInput,
      adjustment: { ...emptyAdjustment('2026-09'), bufferOpnameCents: 14000 },
    })
    expect(tasks[0]).toMatchObject({ id: 'buffer-withdrawal:2026-09', reverse: true, amountCents: 14000 })
  })

  it('only lists a cancelled subscription as a task in the month it was cancelled', () => {
    const tasks = deriveTasks({
      ...baseInput,
      subscriptions: [
        { id: 's1', name: 'Netflix', amountCents: 1200, cancelledAt: '2026-09-05' },
        { id: 's2', name: 'Disney+', amountCents: 900, cancelledAt: '2026-06-01' },
        { id: 's3', name: 'Spotify', amountCents: 1000, cancelledAt: null },
      ],
    })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ id: 'subscription-cancel:s1', amountCents: -1200 })
  })

  it('routes a review-queue task into Nakijken instead of being checkable', () => {
    const tasks = deriveTasks({ ...baseInput, reviewQueueCount: 4 })
    expect(tasks[0]).toMatchObject({ id: 'review:2026-09', route: '/nakijken', title: '4 transacties nakijken' })
  })
})
