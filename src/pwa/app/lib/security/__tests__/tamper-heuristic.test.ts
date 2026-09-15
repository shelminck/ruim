import { describe, expect, it } from 'vitest'
import { detectPassiveSignals, evaluateAttestation, hasAlreadyConsented } from '../tamper-heuristic'
import type { SecurityConsentLog } from '../../domain/types'

describe('evaluateAttestation', () => {
  it('flags a null attestationObject as missing', () => {
    expect(evaluateAttestation(null)).toEqual(['webauthn-attestation-missing'])
  })

  it('flags a tiny attestationObject (no real attestation statement) as missing', () => {
    expect(evaluateAttestation(new ArrayBuffer(60))).toEqual(['webauthn-attestation-missing'])
  })

  it('accepts a large attestationObject (a real statement/certificate) as genuine', () => {
    expect(evaluateAttestation(new ArrayBuffer(600))).toEqual([])
  })
})

describe('detectPassiveSignals', () => {
  it('reports no false positives in a plain Node/vitest environment (no window/navigator, Web Crypto present)', () => {
    expect(detectPassiveSignals()).toEqual([])
  })
})

describe('hasAlreadyConsented', () => {
  const baseLog: SecurityConsentLog = {
    id: '1',
    timestamp: '2026-01-01T00:00:00.000Z',
    heuristieken: ['insecure-context'],
    appVersie: '0.1.0',
    toestelHash: 'abc',
  }

  it('is false with no logs at all', () => {
    expect(hasAlreadyConsented([], '0.1.0')).toBe(false)
  })

  it('is true once a log exists for the current app version', () => {
    expect(hasAlreadyConsented([baseLog], '0.1.0')).toBe(true)
  })

  it('is false again after an app-version bump, even with prior consent logged', () => {
    expect(hasAlreadyConsented([baseLog], '0.2.0')).toBe(false)
  })
})
