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
