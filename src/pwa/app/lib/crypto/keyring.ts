import { getSodium } from './sodium'
import { readKeyring, writeKeyring } from '../db/blob-store'
import { wrapDek, unwrapDek } from './dek-wrap'

/**
 * MODERATE, not INTERACTIVE: a PIN has far less entropy than a real
 * password, so the Argon2id cost needs to compensate — this is the "hoge
 * iteratiecount" ADR 0005 §2 calls for. Costs roughly a few hundred ms per
 * attempt on typical hardware, which is fine for something typed once per
 * session but meaningfully slows down brute-forcing.
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  const sodium = await getSodium()
  return sodium.crypto_pwhash(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    pin,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  )
}

export async function hasKeyring(): Promise<boolean> {
  return (await readKeyring()) !== undefined
}

/** First-run setup: generates a fresh random DEK, wraps it under the chosen PIN, and persists the keyring. */
export async function setupPin(pin: string): Promise<Uint8Array> {
  const sodium = await getSodium()
  const dek = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const pinKey = await deriveKeyFromPin(pin, salt)
  const wrappedDek = await wrapDek(dek, pinKey)

  await writeKeyring({ salt, wrappedDek })
  return dek
}

/** Returns the DEK on a correct PIN, or null on a wrong one (no keyring at all is a programmer error — check hasKeyring() first). */
export async function unlockWithPin(pin: string): Promise<Uint8Array | null> {
  const keyring = await readKeyring()
  if (!keyring) throw new Error('No keyring to unlock — call hasKeyring() first')

  const pinKey = await deriveKeyFromPin(pin, keyring.salt)
  return unwrapDek(keyring.wrappedDek, pinKey)
}

/** Re-wraps the already-unlocked DEK under a new PIN — the DEK itself, and thus the encrypted blob, never changes. Caller is expected to have already re-authenticated (ADR 0005 §5). */
export async function changePin(dek: Uint8Array, newPin: string): Promise<void> {
  const keyring = await readKeyring()
  if (!keyring) throw new Error('No keyring to update — call hasKeyring() first')

  const sodium = await getSodium()
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const pinKey = await deriveKeyFromPin(newPin, salt)
  const wrappedDek = await wrapDek(dek, pinKey)

  await writeKeyring({ ...keyring, salt, wrappedDek })
}
