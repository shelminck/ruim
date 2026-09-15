import { getSodium } from './sodium'
import { wrapDek, unwrapDek } from './dek-wrap'
import { readKeyring, writeKeyring } from '../db/blob-store'
import { evaluateAttestation } from '../security/tamper-heuristic'

const RP_NAME = 'ruim'
const PRF_SALT_BYTES = 32

/**
 * libsodium's Uint8Arrays are typed as backed by `ArrayBufferLike`, which
 * TS's DOM lib no longer accepts as `BufferSource` (it now excludes
 * SharedArrayBuffer-backed views) — they're always plain ArrayBuffers in
 * practice, so copying through `Uint8Array.from` satisfies the type without
 * changing behavior.
 */
function asBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(bytes)
}

/**
 * Whether this device even has a platform authenticator worth offering
 * biometry for. This is *not* a guarantee that the PRF extension will work —
 * that's only known after a real credential-creation attempt (see
 * setupBiometric) — but it's enough to decide whether to show the offer at
 * all, per ADR 0005 §2.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined' || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
    return false
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function hasBiometric(): Promise<boolean> {
  const keyring = await readKeyring()
  return keyring?.biometric !== undefined
}

/**
 * Registers a platform credential and, only if it actually supports the PRF
 * extension (not guaranteed just because a platform authenticator exists —
 * older Safari/Android in particular), wraps the already-unlocked DEK under
 * a PRF-derived secret. Never throws for an unsupported/declined/failed
 * attempt — callers just keep using the PIN, per ADR 0005 §2 ("PIN is niet
 * optioneel als fallback").
 */
export async function setupBiometric(dek: Uint8Array): Promise<boolean> {
  const sodium = await getSodium()
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        rp: { name: RP_NAME },
        user: { id: asBufferSource(sodium.randombytes_buf(16)), name: 'ruim', displayName: 'ruim' },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'required' },
        // 'direct' feeds the tamper-heuristiek from ADR 0005 §3 — many
        // platform authenticators still return a 'none'-shaped attestation
        // anyway for privacy reasons, which is itself the (weak) signal.
        attestation: 'direct',
        extensions: { prf: {} },
      },
    })) as PublicKeyCredential | null
  } catch {
    return false
  }
  if (!credential || !credential.getClientExtensionResults().prf?.enabled) {
    return false
  }

  const credentialId = new Uint8Array(credential.rawId)
  const salt = sodium.randombytes_buf(PRF_SALT_BYTES)
  const secret = await evalPrf(credentialId, salt)
  if (!secret) return false

  const wrapKey = sodium.crypto_generichash(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, secret, null)
  const wrappedDek = await wrapDek(dek, wrapKey)

  const attestationResponse = credential.response as AuthenticatorAttestationResponse
  const attestationLooksGenuine = evaluateAttestation(attestationResponse.attestationObject).length === 0

  const keyring = await readKeyring()
  if (!keyring) throw new Error('No PIN keyring to attach biometry to — set up a PIN first')
  await writeKeyring({ ...keyring, biometric: { credentialId, salt, wrappedDek, attestationLooksGenuine } })
  return true
}

/** Returns the DEK via the registered platform authenticator, or null if biometry isn't set up, was declined, or failed. */
export async function unlockWithBiometric(): Promise<Uint8Array | null> {
  const keyring = await readKeyring()
  if (!keyring?.biometric) return null

  const sodium = await getSodium()
  const secret = await evalPrf(keyring.biometric.credentialId, keyring.biometric.salt)
  if (!secret) return null

  const wrapKey = sodium.crypto_generichash(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, secret, null)
  return unwrapDek(keyring.biometric.wrappedDek, wrapKey)
}

/** Requests the platform authenticator's PRF output for `salt`, or null on any unsupported/declined/failed attempt. */
async function evalPrf(credentialId: Uint8Array, salt: Uint8Array): Promise<Uint8Array | null> {
  let assertion: PublicKeyCredential | null
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: asBufferSource(credentialId), type: 'public-key' }],
        userVerification: 'required',
        extensions: { prf: { eval: { first: asBufferSource(salt) } } },
      },
    })) as PublicKeyCredential | null
  } catch {
    return null
  }
  const result = assertion?.getClientExtensionResults().prf?.results?.first
  return result ? new Uint8Array(result as ArrayBuffer) : null
}
