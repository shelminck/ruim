<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUnlockSession } from '../lib/crypto/session'
import { useSecurityCheckStatus } from '../composables/useSecurityCheckStatus'
import { getOrCreateDeviceHash, readKeyring } from '../lib/db/blob-store'
import { listSecurityConsentLogs, recordSecurityConsent } from '../lib/db/security-consent'
import { detectPassiveSignals, hasAlreadyConsented, type TamperSignal } from '../lib/security/tamper-heuristic'

const { isUnlocked } = useUnlockSession()
const { record: recordCheckStatus } = useSecurityCheckStatus()
const appVersion = useRuntimeConfig().public.appVersion

const visible = ref(false)
const busy = ref(false)
const signals = ref<TamperSignal[]>([])

// Only meaningful once the encrypted DB is reachable (SecurityConsentLog
// lives there, per ADR 0005 §3) — runs once per unlock, not on every render.
watch(
  isUnlocked,
  async (unlocked) => {
    if (!unlocked) return

    const keyring = await readKeyring()
    const attestationSignals: TamperSignal[] =
      keyring?.biometric?.attestationLooksGenuine === false ? ['webauthn-attestation-missing'] : []
    const found = [...new Set([...detectPassiveSignals(), ...attestationSignals])]
    // Recorded regardless of outcome — the accountpagina's statusregel needs
    // a "laatste controle" even on a clean run, unlike SecurityConsentLog
    // which only gets a row once the user has actually consented.
    recordCheckStatus(found.length === 0)
    if (found.length === 0) return

    const logs = await listSecurityConsentLogs()
    if (hasAlreadyConsented(logs, appVersion)) return

    signals.value = found
    visible.value = true
  },
  { immediate: true },
)

async function confirm() {
  busy.value = true
  try {
    const deviceHash = await getOrCreateDeviceHash()
    await recordSecurityConsent(signals.value, appVersion, deviceHash)
    visible.value = false
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="overlay">
    <div class="dialog">
      <h2 class="title">Beveiligingsstatus kon niet worden geverifieerd</h2>
      <p class="sub">
        Dit toestel voldeed niet aan alle verwachte beveiligingskenmerken. Dat is een indicatie, geen bewijs van een
        probleem — je kunt gewoon doorgaan. Weet wel: als dit toestel is gemanipuleerd, biedt de versleuteling van je
        gegevens minder garantie dan normaal.
      </p>
      <button type="button" class="primary-button" :disabled="busy" @click="confirm">
        Ik begrijp het risico en ga door
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink-deep) 55%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
}

.dialog {
  background: var(--card);
  border-radius: var(--radius-panel-lg);
  box-shadow: var(--shadow-lg);
  padding: 32px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--ink-deep);
}

.sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.primary-button {
  align-self: flex-start;
  border: none;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 14px;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
