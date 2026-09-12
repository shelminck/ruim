import { loadWaterfall } from './useWaterfall'
import { listLabels } from '../lib/db/labels'

const vasteLastenCents = ref(0)
const basisCents = ref(0)
const labelCount = ref(0)

/**
 * The sidebar's secondary-nav values (Vaste lasten/Inkomen/Labels totals).
 * The sidebar itself only mounts once in this SPA, so any page that changes
 * these underlying numbers must call refresh() explicitly — same pattern as
 * useNakijkenCount/useTeDoenCount.
 */
export function useSidebarValues() {
  async function refresh() {
    const [waterfall, labels] = await Promise.all([loadWaterfall(), listLabels()])
    vasteLastenCents.value = waterfall.vasteLasten
    basisCents.value = waterfall.basis
    labelCount.value = labels.length
  }

  return {
    vasteLastenCents: readonly(vasteLastenCents),
    basisCents: readonly(basisCents),
    labelCount: readonly(labelCount),
    refresh,
  }
}
