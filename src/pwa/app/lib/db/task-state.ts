import { getDb } from './client'
import type { TaskState } from '../domain/types'

export async function listTaskStatesForMonth(month: string): Promise<TaskState[]> {
  const db = await getDb()
  return db.getAllFromIndex('tasks', 'byMonth', month)
}

export async function getTaskState(id: string, month: string): Promise<TaskState> {
  const db = await getDb()
  return (await db.get('tasks', id)) ?? { id, month, done: false, dismissed: false }
}

export async function saveTaskState(state: TaskState): Promise<void> {
  const db = await getDb()
  await db.put('tasks', state)
}

/** "Nieuwe maand · lijst terugzetten": clears done/dismissed state for the given month. Rules and tasks themselves are untouched — tasks are derived, never stored. */
export async function clearTaskStatesForMonth(month: string): Promise<void> {
  const db = await getDb()
  const keys = await db.getAllKeysFromIndex('tasks', 'byMonth', month)
  const tx = db.transaction('tasks', 'readwrite')
  await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done])
}
