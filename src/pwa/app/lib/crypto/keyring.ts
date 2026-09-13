import { getSodium } from './sodium'
import { readKeyring, writeKeyring } from '../db/blob-store'

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

  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(dek, null, null, nonce, pinKey)
  const wrappedDek = new Uint8Array(nonce.length + ciphertext.length)
  wrappedDek.set(nonce, 0)
  wrappedDek.set(ciphertext, nonce.length)

  await writeKeyring({ salt, wrappedDek })
  return dek
}

/** Returns the DEK on a correct PIN, or null on a wrong one (no keyring at all is a programmer error — check hasKeyring() first). */
export async function unlockWithPin(pin: string): Promise<Uint8Array | null> {
  const keyring = await readKeyring()
  if (!keyring) throw new Error('No keyring to unlock — call hasKeyring() first')

  const sodium = await getSodium()
  const pinKey = await deriveKeyFromPin(pin, keyring.salt)
  const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  const nonce = keyring.wrappedDek.slice(0, nonceLength)
  const ciphertext = keyring.wrappedDek.slice(nonceLength)

  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, pinKey)
  } catch {
    return null
  }
}
