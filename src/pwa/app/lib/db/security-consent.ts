import { getDb } from './client'
import type { SecurityConsentLog } from '../domain/types'

export async function listSecurityConsentLogs(): Promise<SecurityConsentLog[]> {
  const db = await getDb()
  return db.getAll('securityConsentLog')
}

export async function recordSecurityConsent(
  heuristieken: string[],
  appVersie: string,
  toestelHash: string,
): Promise<SecurityConsentLog> {
  const db = await getDb()
  const log: SecurityConsentLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    heuristieken,
    appVersie,
    toestelHash,
  }
  await db.put('securityConsentLog', log)
  return log
}
