import { getSodium } from './sodium'

/** Wraps `dek` under `key` with a fresh random nonce, prepended to the ciphertext. Shared by every DEK-unwrap method in the keyring (PIN, biometric) — see ADR 0005 §2. */
export async function wrapDek(dek: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const sodium = await getSodium()
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(dek, null, null, nonce, key)
  const wrapped = new Uint8Array(nonce.length + ciphertext.length)
  wrapped.set(nonce, 0)
  wrapped.set(ciphertext, nonce.length)
  return wrapped
}

/** Returns the DEK, or null if `key` is wrong / `wrapped` was tampered with — never throws on a bad key, since that's an expected user event (wrong PIN, declined biometric), not a programmer error. */
export async function unwrapDek(wrapped: Uint8Array, key: Uint8Array): Promise<Uint8Array | null> {
  const sodium = await getSodium()
  const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  const nonce = wrapped.slice(0, nonceLength)
  const ciphertext = wrapped.slice(nonceLength)
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, key)
  } catch {
    return null
  }
}
