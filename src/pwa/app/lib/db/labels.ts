import { getDb } from './client'
import type { Label } from '../domain/types'

export async function listLabels(): Promise<Label[]> {
  const db = await getDb()
  return db.getAll('labels')
}

export async function getLabel(id: string): Promise<Label | undefined> {
  const db = await getDb()
  return db.get('labels', id)
}

export async function createLabel(name: string): Promise<Label> {
  const db = await getDb()
  const label: Label = { id: crypto.randomUUID(), name }
  await db.put('labels', label)
  return label
}

export async function removeLabel(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('labels', id)
}
