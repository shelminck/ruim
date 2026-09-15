import type { SecurityConsentLog } from '../domain/types'

export type TamperSignal =
  | 'webauthn-attestation-missing'
  | 'insecure-context'
  | 'webcrypto-unavailable'
  | 'ua-client-hints-mismatch'

/**
 * A `'none'`-format attestationObject is just authData with an empty
 * attestation statement — on the order of 40-70 bytes. A genuine attestation
 * statement adds a certificate (chain), pushing this well past a few hundred
 * bytes. This is a byte-length heuristic, not a CBOR parse of the `fmt`
 * field — proportionate to a "best effort, geen garantie" signal (ADR 0005
 * §3), not a precise one, and avoids pulling in a CBOR-parsing dependency
 * for a signal that isn't airtight either way.
 */
const ATTESTATION_STATEMENT_MIN_BYTES = 200

/** Only meaningful right after a WebAuthn credential is created (biometric setup) — attestation can't be re-checked later without creating a new one. */
export function evaluateAttestation(attestationObject: ArrayBuffer | null): TamperSignal[] {
  if (!attestationObject || attestationObject.byteLength < ATTESTATION_STATEMENT_MIN_BYTES) {
    return ['webauthn-attestation-missing']
  }
  return []
}

/** Feature-detection only, no user interaction and no WebAuthn prompt — safe to run on every app start. */
export function detectPassiveSignals(): TamperSignal[] {
  const signals: TamperSignal[] = []

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    signals.push('insecure-context')
  }

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    signals.push('webcrypto-unavailable')
  }

  if (typeof navigator !== 'undefined') {
    const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
    if (uaData && typeof uaData.mobile === 'boolean') {
      const uaStringSaysMobile = /Mobi/i.test(navigator.userAgent)
      if (uaData.mobile !== uaStringSaysMobile) {
        signals.push('ua-client-hints-mismatch')
      }
    }
  }

  return signals
}

/** Whether the user already acknowledged the consent modal for this app version — re-shown only when a new version triggers it again, per ADR 0005 §3. */
export function hasAlreadyConsented(logs: SecurityConsentLog[], appVersie: string): boolean {
  return logs.some((log) => log.appVersie === appVersie)
}
