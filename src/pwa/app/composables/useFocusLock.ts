import { onMounted, onUnmounted, watch } from 'vue'
import { useUnlockSession } from '../lib/crypto/session'

/**
 * Supplementary to focus-lock, for the case where the app stays foregrounded
 * and the screen stays on without any interaction — ADR 0005 §5 calls
 * focus-lock the primary mitigation, this just covers the gap it leaves.
 * Not user-configurable yet; no settings UI exists for it.
 */
const IDLE_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Locks the session immediately on focus loss / screen off (Page
 * Visibility API) — the main mitigation from ADR 0005 §5 for the window
 * where an unattended, already-unlocked device is usable. An idle-timeout
 * covers the remaining case where the app stays visible without input.
 * Meant to be called exactly once, from the root layout.
 */
export function useFocusLock() {
  const { isUnlocked, lock } = useUnlockSession()

  let idleTimer: ReturnType<typeof setTimeout> | null = null

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function resetIdleTimer() {
    clearIdleTimer()
    if (isUnlocked.value) {
      idleTimer = setTimeout(lock, IDLE_TIMEOUT_MS)
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      lock()
    }
  }

  const activityEvents = ['pointerdown', 'keydown'] as const

  watch(isUnlocked, (unlocked) => {
    if (unlocked) {
      resetIdleTimer()
    } else {
      clearIdleTimer()
    }
  })

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    for (const event of activityEvents) {
      window.addEventListener(event, resetIdleTimer)
    }
    resetIdleTimer()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    for (const event of activityEvents) {
      window.removeEventListener(event, resetIdleTimer)
    }
    clearIdleTimer()
  })
}
