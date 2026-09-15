import { readonly, ref } from 'vue'

const STORAGE_KEY = 'ruim:laatste-beveiligingscontrole'

export interface SecurityCheckStatus {
  timestamp: string
  verified: boolean
}

function load(): SecurityCheckStatus | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SecurityCheckStatus
  } catch {
    return null
  }
}

// Module-level singleton, same pattern as useActiveGezinslid — per-device,
// not synced, just a UI convenience for the accountpagina's statusregel
// (ADR 0005 §4/§6). Not the SecurityConsentLog itself: that only gets a row
// when a signal actually fires (see TamperConsentGate.vue); this tracks
// every check, clean or not, so "laatste controle" always has a value once
// at least one unlock has happened.
const status = ref<SecurityCheckStatus | null>(load())

export function useSecurityCheckStatus() {
  function record(verified: boolean) {
    const value: SecurityCheckStatus = { timestamp: new Date().toISOString(), verified }
    status.value = value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  }

  return {
    status: readonly(status),
    record,
  }
}
