import { listGezinsleden } from '../lib/db/gezinsleden'
import type { Gezinslid } from '../lib/domain/types'

const gezinsleden = ref<Gezinslid[]>([])
const loaded = ref(false)

/**
 * Shared gezinsleden list — same singleton-plus-refresh pattern as
 * useNakijkenCount/useSidebarValues. Anything that creates/removes a
 * gezinslid must call refresh() so the sidebar (and the picker itself)
 * pick up the change without a full reload.
 */
export function useGezinsleden() {
  async function refresh() {
    gezinsleden.value = await listGezinsleden()
    loaded.value = true
  }

  return {
    gezinsleden: readonly(gezinsleden),
    loaded: readonly(loaded),
    refresh,
  }
}
