import type { Buffer, Goal, Investing, MonthlyAdjustment, Subscription, TaskGroup } from './types'

export interface DerivedTask {
  id: string
  group: TaskGroup
  title: string
  subtitle: string | null
  amountCents: number | null
  /** Set for tasks that open another screen instead of being checked off (e.g. the review queue). */
  route: string | null
  /** Direction hint for "Uit de buffer halen" style reverse transfers — rendered with the soft/ink treatment. */
  reverse: boolean
}

export interface DeriveTasksInput {
  month: string
  buffer: Pick<Buffer, 'monthlyContributionCents'>
  investing: Pick<Investing, 'monthlyDepositCents'>
  goals: Pick<Goal, 'id' | 'name' | 'monthlyDepositCents' | 'transferDay' | 'pauseWhenIncomeLow'>[]
  subscriptions: Pick<Subscription, 'id' | 'name' | 'amountCents' | 'cancelledAt'>[]
  adjustment: MonthlyAdjustment
  reviewQueueCount: number
}

const INVESTING_TRANSFER_DAY = 27
const BUFFER_TRANSFER_DAY = 26

export function deriveTasks(input: DeriveTasksInput): DerivedTask[] {
  const { month, buffer, investing, goals, subscriptions, adjustment, reviewQueueCount } = input
  const tasks: DerivedTask[] = []

  if (buffer.monthlyContributionCents > 0) {
    tasks.push({
      id: `buffer-topup:${month}`,
      group: 'overboeken',
      title: 'Buffer aanvullen',
      subtitle: `van betaalrekening naar buffer · automatisch de ${BUFFER_TRANSFER_DAY}e`,
      amountCents: buffer.monthlyContributionCents,
      route: null,
      reverse: false,
    })
  }

  for (const goal of goals) {
    if (goal.monthlyDepositCents <= 0) continue
    if (adjustment.incomeDropCents > 0 && goal.pauseWhenIncomeLow) continue

    tasks.push({
      id: `goal-deposit:${goal.id}:${month}`,
      group: 'overboeken',
      title: `${goal.name} · inleg`,
      subtitle: `automatisch · de ${goal.transferDay}e`,
      amountCents: goal.monthlyDepositCents,
      route: null,
      reverse: false,
    })
  }

  if (investing.monthlyDepositCents > 0 && !adjustment.investingPausedThisMonth) {
    tasks.push({
      id: `investing-deposit:${month}`,
      group: 'overboeken',
      title: 'Beleggen',
      subtitle: `automatisch · de ${INVESTING_TRANSFER_DAY}e`,
      amountCents: investing.monthlyDepositCents,
      route: null,
      reverse: false,
    })
  }

  if (adjustment.extraBufferCents > 0) {
    tasks.push({
      id: `windfall-buffer:${month}`,
      group: 'overboeken',
      title: 'Meevaller naar buffer overboeken',
      subtitle: 'eenmalig, vanuit deze maands meevaller',
      amountCents: adjustment.extraBufferCents,
      route: null,
      reverse: false,
    })
  }

  if (adjustment.extraBelegCents > 0) {
    tasks.push({
      id: `windfall-investing:${month}`,
      group: 'overboeken',
      title: 'Meevaller naar beleggen overboeken',
      subtitle: 'eenmalig, vanuit deze maands meevaller',
      amountCents: adjustment.extraBelegCents,
      route: null,
      reverse: false,
    })
  }

  if (adjustment.bufferOpnameCents > 0) {
    tasks.push({
      id: `buffer-withdrawal:${month}`,
      group: 'overboeken',
      title: 'Uit de buffer halen',
      subtitle: 'om de lagere inkomsten deze maand op te vangen',
      amountCents: adjustment.bufferOpnameCents,
      route: null,
      reverse: true,
    })
  }

  for (const subscription of subscriptions) {
    if (!subscription.cancelledAt?.startsWith(month)) continue
    tasks.push({
      id: `subscription-cancel:${subscription.id}`,
      group: 'regelen',
      title: `${subscription.name} opzeggen`,
      subtitle: 'bij de aanbieder — Ruim heeft het al uit je vaste lasten gehaald',
      amountCents: -subscription.amountCents,
      route: null,
      reverse: false,
    })
  }

  if (adjustment.investingPausedThisMonth) {
    tasks.push({
      id: `investing-pause-arrange:${month}`,
      group: 'regelen',
      title: 'Automatische inleg beleggen verlagen',
      subtitle: 'zodat de bank ook echt minder overboekt',
      amountCents: null,
      route: null,
      reverse: false,
    })
  }

  if (reviewQueueCount > 0) {
    tasks.push({
      id: `review:${month}`,
      group: 'regelen',
      title: `${reviewQueueCount} transacties nakijken`,
      subtitle: null,
      amountCents: null,
      route: '/nakijken',
      reverse: false,
    })
  }

  return tasks
}
