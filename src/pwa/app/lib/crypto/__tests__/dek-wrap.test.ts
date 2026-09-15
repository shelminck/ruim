import { describe, expect, it } from 'vitest'
import { getSodium } from '../sodium'
import { unwrapDek, wrapDek } from '../dek-wrap'

describe('dek-wrap', () => {
  it('round-trips a DEK under a given key', async () => {
    const sodium = await getSodium()
    const dek = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)
    const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)

    const wrapped = await wrapDek(dek, key)
    const unwrapped = await unwrapDek(wrapped, key)

    expect(unwrapped).toEqual(dek)
  })

  it('returns null, not a throw, when unwrapping with the wrong key — a wrong PIN/biometric secret is an expected event', async () => {
    const sodium = await getSodium()
    const dek = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)
    const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)
    const wrongKey = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)

    const wrapped = await wrapDek(dek, key)

    await expect(unwrapDek(wrapped, wrongKey)).resolves.toBeNull()
  })

  it('uses a fresh nonce every call, so wrapping the same DEK twice never produces the same bytes', async () => {
    const sodium = await getSodium()
    const dek = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)
    const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES)

    const first = await wrapDek(dek, key)
    const second = await wrapDek(dek, key)

    expect(first).not.toEqual(second)
  })
})
