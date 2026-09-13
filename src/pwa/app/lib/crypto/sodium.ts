// The regular libsodium-wrappers package ships a size-optimized WASM build
// that excludes crypto_pwhash (Argon2id) entirely — only the "sumo" build
// has it, hence this import instead of the more commonly recommended one.
import sodium from 'libsodium-wrappers-sumo'

let readyPromise: Promise<typeof sodium> | null = null

/** libsodium-wrappers' WASM module needs a one-time async init before any crypto_* call is safe to use. */
export function getSodium(): Promise<typeof sodium> {
  if (!readyPromise) {
    readyPromise = sodium.ready.then(() => sodium)
  }
  return readyPromise
}
