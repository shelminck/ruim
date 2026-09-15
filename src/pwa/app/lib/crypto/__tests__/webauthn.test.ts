import { afterEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { resetBlobDbConnection } from '../../db/blob-store'
import { setupPin } from '../keyring'
import { hasBiometric, isPlatformAuthenticatorAvailable, setupBiometric, unlockWithBiometric } from '../webauthn'

afterEach(() => {
  resetBlobDbConnection()
})

describe('webauthn (no browser WebAuthn support, as in this vitest/node environment)', () => {
  it('reports no platform authenticator available rather than throwing', async () => {
    await expect(isPlatformAuthenticatorAvailable()).resolves.toBe(false)
  })

  it('setupBiometric fails gracefully — the PIN keeps working, per ADR 0005 §2', async () => {
    const dek = await setupPin('123456')

    await expect(setupBiometric(dek)).resolves.toBe(false)
    await expect(hasBiometric()).resolves.toBe(false)
  })

  it('unlockWithBiometric returns null when biometry was never set up', async () => {
    await setupPin('123456')

    await expect(unlockWithBiometric()).resolves.toBeNull()
  })
})
