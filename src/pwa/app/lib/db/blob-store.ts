import { openDB, type IDBPDatabase } from 'idb'

const BLOB_DB_NAME = 'ruim-sqlite'
const BLOB_DB_VERSION = 2
const BLOB_STORE = 'blob'
const BLOB_KEY = 'db'
const KEYRING_STORE = 'keyring'
const KEYRING_KEY = 'keyring'
const DEVICE_HASH_KEY = 'device-hash'

export interface Keyring {
  /** Argon2id salt for deriving a key from the PIN — crypto_pwhash_SALTBYTES. */
  salt: Uint8Array
  /** nonce (crypto_aead_xchacha20poly1305_ietf_NPUBBYTES) + ciphertext, wrapping the DEK under the PIN-derived key. */
  wrappedDek: Uint8Array
  /** Optional WebAuthn PRF-based unlock, additive to the PIN, never a replacement — ADR 0005 §2. Absent when biometry hasn't been set up on this device. */
  biometric?: {
    /** WebAuthn credential id (`rawId`), needed to target the right platform authenticator on each unlock. */
    credentialId: Uint8Array
    /** Fixed per credential so the PRF eval returns the same secret on every unlock. */
    salt: Uint8Array
    /** nonce + ciphertext, wrapping the DEK under a key derived from the PRF secret. */
    wrappedDek: Uint8Array
    /** Result of lib/security/tamper-heuristic.ts evaluateAttestation() at credential-creation time — feeds the tamper-heuristiek consent flow, ADR 0005 §3. */
    attestationLooksGenuine: boolean
  }
}

/**
 * The only remaining use of raw IndexedDB in this app: a single opaque byte
 * blob (the exported sql.js database, encrypted — see lib/crypto/), not a
 * data model of its own. Every domain record lives inside that blob, not as
 * separate IndexedDB records — see ADR 0005 §2.
 *
 * The keyring lives alongside it, unencrypted by necessity: it's what
 * unlocks the blob in the first place, so it can't itself be inside the
 * blob. Its own protection is that it holds a *wrapped* DEK, never the PIN
 * or the DEK itself — brute-forcing the wrap still requires Argon2id per
 * guess.
 */
let blobDbPromise: Promise<IDBPDatabase> | null = null

function openBlobDb(): Promise<IDBPDatabase> {
  if (!blobDbPromise) {
    blobDbPromise = openDB(BLOB_DB_NAME, BLOB_DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(BLOB_STORE)
        }
        if (oldVersion < 2) {
          db.createObjectStore(KEYRING_STORE)
        }
      },
    })
  }
  return blobDbPromise
}

export async function readBlob(): Promise<Uint8Array | undefined> {
  const db = await openBlobDb()
  return db.get(BLOB_STORE, BLOB_KEY)
}

export async function writeBlob(bytes: Uint8Array): Promise<void> {
  const db = await openBlobDb()
  await db.put(BLOB_STORE, bytes, BLOB_KEY)
}

export async function readKeyring(): Promise<Keyring | undefined> {
  const db = await openBlobDb()
  return db.get(KEYRING_STORE, KEYRING_KEY)
}

export async function writeKeyring(keyring: Keyring): Promise<void> {
  const db = await openBlobDb()
  await db.put(KEYRING_STORE, keyring, KEYRING_KEY)
}

/**
 * A random id generated once per device, not derived from any real hardware
 * identifier — "niet-herleidbare toestel-hash" (ADR 0005 §3). Only used to
 * correlate multiple SecurityConsentLog entries from the same device for
 * support purposes. Lives alongside the keyring since it's needed before
 * (and independent of) any unlock.
 */
export async function getOrCreateDeviceHash(): Promise<string> {
  const db = await openBlobDb()
  const existing = await db.get(KEYRING_STORE, DEVICE_HASH_KEY)
  if (existing) return existing
  const hash = crypto.randomUUID()
  await db.put(KEYRING_STORE, hash, DEVICE_HASH_KEY)
  return hash
}

/** Test-only: force a fresh connection (e.g. after resetting fake-indexeddb between tests). */
export function resetBlobDbConnection(): void {
  blobDbPromise = null
}
