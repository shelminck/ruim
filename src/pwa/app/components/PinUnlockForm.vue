<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { unlockWithPin } from '../lib/crypto/keyring'
import { hasBiometric, unlockWithBiometric } from '../lib/crypto/webauthn'

// Shared PIN/biometric confirmation UI — used both by the full-session
// UnlockGate and by ReauthModal's per-action re-authentication (ADR 0005
// §5), so the brute-force backoff and biometric-first flow only exist once.
const emit = defineEmits<{ unlocked: [dek: Uint8Array] }>()

const pin = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

const biometricEnabled = ref(false)
const biometricBusy = ref(false)

// In-memory only, resets on reload — Argon2id's own cost per attempt (see
// keyring.ts) is the primary brake, this is a UX nudge on top, not the
// security boundary itself.
const failedAttempts = ref(0)
const backoffMs = computed(() => (failedAttempts.value <= 2 ? 0 : Math.min(500 * 2 ** (failedAttempts.value - 2), 8000)))

onMounted(async () => {
  biometricEnabled.value = await hasBiometric()
  if (biometricEnabled.value) {
    // Auto-triggered on entry per the hand-off's unlock-screen spec — the
    // PIN field underneath is the silent fallback if this is declined/fails.
    attemptBiometricUnlock(true)
  }
})

async function attemptBiometricUnlock(silent: boolean) {
  biometricBusy.value = true
  try {
    const dek = await unlockWithBiometric()
    if (dek) {
      emit('unlocked', dek)
    } else if (!silent) {
      error.value = 'Niet gelukt. Gebruik je pincode.'
    }
  } finally {
    biometricBusy.value = false
  }
}

async function submitUnlock() {
  error.value = null
  if (backoffMs.value > 0) return
  busy.value = true
  try {
    const dek = await unlockWithPin(pin.value)
    if (dek) {
      emit('unlocked', dek)
    } else {
      failedAttempts.value += 1
      error.value = 'Onjuiste pincode.'
      pin.value = ''
      if (backoffMs.value > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs.value))
      }
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <template v-if="biometricEnabled">
    <p class="sub">Ontgrendel met vingerafdruk of gezicht, of gebruik je pincode.</p>
    <button
      type="button"
      class="primary-button"
      :disabled="biometricBusy"
      @click="attemptBiometricUnlock(false)"
    >
      Ontgrendel met vingerafdruk / gezicht
    </button>
  </template>
  <p v-else class="sub">Voer je pincode in om verder te gaan.</p>
  <form class="pin-form" novalidate @submit.prevent="submitUnlock">
    <input
      v-model="pin"
      type="password"
      inputmode="numeric"
      pattern="[0-9]*"
      placeholder="Pincode"
      class="input"
      autocomplete="current-password"
      autofocus
    />
    <p v-if="error" class="error-line">{{ error }}</p>
    <button type="submit" class="primary-button" :disabled="busy || backoffMs > 0">Ontgrendelen</button>
  </form>
</template>

<style scoped>
.sub {
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.pin-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 14px;
  letter-spacing: 2px;
}

.error-line {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-accent-700);
}

.primary-button {
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
