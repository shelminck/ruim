import { readonly, ref } from 'vue'

const STORAGE_KEY = 'ruim:actief-gezinslid-id'

// Module-level singleton, not synced (per-device choice, per ADR 0005) — deliberately
// separate from the IndexedDB stores so it never travels with the encrypted/synced data.
const actiefGezinslidId = ref<string | null>(localStorage.getItem(STORAGE_KEY))

/** Per-device active family member — informational/personalization only, never an access boundary. */
export function useActiveGezinslid() {
  function kies(id: string) {
    actiefGezinslidId.value = id
    localStorage.setItem(STORAGE_KEY, id)
  }

  function wis() {
    actiefGezinslidId.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    actiefGezinslidId: readonly(actiefGezinslidId),
    kies,
    wis,
  }
}
