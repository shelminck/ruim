import { readonly, ref } from 'vue'

/**
 * Module-level singleton (same pattern as useActiveGezinslid/session.ts) —
 * a single pending re-auth request at a time, shown by ReauthModal wherever
 * it's mounted (once, in the root layout).
 */
const pendingReason = ref<string | null>(null)
let resolvePending: ((confirmed: boolean) => void) | null = null

/**
 * Re-authentication independent of the general unlock session, required
 * right before a sensitive action even while already unlocked — ADR 0005
 * §5/§6. Minimally: showing/changing the sync password, showing the join
 * QR, revoking a device, changing the PIN, toggling biometry, future export.
 */
export function useReauthGuard() {
  return {
    pendingReason: readonly(pendingReason),
    /** Resolves true once PIN/biometric is re-confirmed, false if the user cancels. */
    requireReauth(reason: string): Promise<boolean> {
      pendingReason.value = reason
      return new Promise((resolve) => {
        resolvePending = resolve
      })
    },
    confirm() {
      pendingReason.value = null
      resolvePending?.(true)
      resolvePending = null
    },
    cancel() {
      pendingReason.value = null
      resolvePending?.(false)
      resolvePending = null
    },
  }
}
