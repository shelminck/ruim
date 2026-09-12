import { deriveTasks } from '../lib/domain/tasks'
import { currentMonthKey } from '../lib/domain/budget'
import { getBuffer } from '../lib/db/buffer'
import { getInvesting } from '../lib/db/investing'
import { listGoals } from '../lib/db/goals'
import { listSubscriptions } from '../lib/db/subscriptions'
import { getMonthlyAdjustment } from '../lib/db/monthly-adjustments'
import { getDb } from '../lib/db/client'
import { listTaskStatesForMonth } from '../lib/db/task-state'

const count = ref(0)

/** Number of open (not done, not dismissed) Te doen tasks this month — for the sidebar badge. */
export function useTeDoenCount() {
  async function refresh() {
    const month = currentMonthKey()
    const db = await getDb()
    const [buffer, investing, goals, subscriptions, adjustment, transactions, taskStates] = await Promise.all([
      getBuffer(),
      getInvesting(),
      listGoals(),
      listSubscriptions(),
      getMonthlyAdjustment(month),
      db.getAll('transactions'),
      listTaskStatesForMonth(month),
    ])

    const reviewQueueCount = transactions.filter((t) => t.envelopeId === null).length
    const tasks = deriveTasks({ month, buffer, investing, goals, subscriptions, adjustment, reviewQueueCount })
    const stateById = Object.fromEntries(taskStates.map((s) => [s.id, s]))

    count.value = tasks.filter((t) => {
      const state = stateById[t.id]
      return !state?.dismissed && !state?.done
    }).length
  }

  return { count: readonly(count), refresh }
}
