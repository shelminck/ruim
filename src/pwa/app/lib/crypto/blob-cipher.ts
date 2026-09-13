import { getSodium } from './sodium'

/** Encrypts with a fresh random nonce every call, prepended to the ciphertext — never reuse a nonce with the same key. */
export async function encryptBlob(dek: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const sodium = await getSodium()
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, null, null, nonce, dek)
  const out = new Uint8Array(nonce.length + ciphertext.length)
  out.set(nonce, 0)
  out.set(ciphertext, nonce.length)
  return out
}

/** Throws if `dek` is wrong or `data` was tampered with — XChaCha20-Poly1305 is authenticated. */
export async function decryptBlob(dek: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const sodium = await getSodium()
  const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
  const nonce = data.slice(0, nonceLength)
  const ciphertext = data.slice(nonceLength)
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, null, nonce, dek)
}
