import type { Envelope, RolloverPolicy } from '../domain/types'
import { getDb } from './client'

export async function listEnvelopes(): Promise<Envelope[]> {
  const db = await getDb()
  return db.getAll('envelopes')
}

export async function getEnvelope(id: string): Promise<Envelope | undefined> {
  const db = await getDb()
  return db.get('envelopes', id)
}

export interface CreateEnvelopeInput {
  name: string
  accountId: string
  budgetCents: number
  rolloverPolicy: RolloverPolicy
  rolloverGoalId?: string | null
}

export async function createEnvelope(input: CreateEnvelopeInput): Promise<Envelope> {
  const db = await getDb()
  const envelope: Envelope = {
    id: crypto.randomUUID(),
    name: input.name,
    accountId: input.accountId,
    budgetCents: input.budgetCents,
    rolloverPolicy: input.rolloverPolicy,
    rolloverGoalId: input.rolloverGoalId ?? null,
    carriedOverCents: 0,
  }
  await db.put('envelopes', envelope)
  return envelope
}

export async function updateEnvelope(envelope: Envelope): Promise<void> {
  const db = await getDb()
  await db.put('envelopes', envelope)
}

export async function removeEnvelope(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('envelopes', id)
}
