import { getDb } from './client'
import type { Subscription } from '../domain/types'

export async function listSubscriptions(): Promise<Subscription[]> {
  const db = await getDb()
  return db.getAll('subscriptions')
}

export interface CreateSubscriptionInput {
  name: string
  amountCents: number
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const db = await getDb()
  const subscription: Subscription = { id: crypto.randomUUID(), cancelledAt: null, ...input }
  await db.put('subscriptions', subscription)
  return subscription
}

export async function toggleSubscriptionCancelled(subscription: Subscription): Promise<void> {
  const db = await getDb()
  const today = new Date().toISOString().slice(0, 10)
  await db.put('subscriptions', {
    ...subscription,
    cancelledAt: subscription.cancelledAt ? null : today,
  })
}

export async function removeSubscription(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('subscriptions', id)
}
