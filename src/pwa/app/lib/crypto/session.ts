import { computed, ref } from 'vue'

// Module-level singleton, not persisted anywhere — the DEK must only ever
// live in memory during an unlocked session (ADR 0005 §2).
const dek = ref<Uint8Array | null>(null)

let resolveWait: ((dek: Uint8Array) => void) | null = null
let waitForUnlock = new Promise<Uint8Array>((resolve) => {
  resolveWait = resolve
})

/** Used by the db layer so getDb() transparently waits for the unlock UI instead of every caller needing to check. */
export function getDekOnceUnlocked(): Promise<Uint8Array> {
  return dek.value ? Promise.resolve(dek.value) : waitForUnlock
}

export function useUnlockSession() {
  return {
    isUnlocked: computed(() => dek.value !== null),
    unlock(newDek: Uint8Array) {
      dek.value = newDek
      resolveWait?.(newDek)
      resolveWait = null
    },
  }
}
