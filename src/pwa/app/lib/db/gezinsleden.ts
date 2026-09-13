import { getDb } from './client'
import type { Gezinslid } from '../domain/types'

export async function listGezinsleden(): Promise<Gezinslid[]> {
  const db = await getDb()
  return db.getAll('gezinsleden')
}

export async function getGezinslid(id: string): Promise<Gezinslid | undefined> {
  const db = await getDb()
  return db.get('gezinsleden', id)
}

export async function createGezinslid(naam: string, avatarKleur: string): Promise<Gezinslid> {
  const db = await getDb()
  const gezinslid: Gezinslid = { id: crypto.randomUUID(), naam, avatarKleur }
  await db.put('gezinsleden', gezinslid)
  return gezinslid
}

export async function removeGezinslid(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('gezinsleden', id)
}
