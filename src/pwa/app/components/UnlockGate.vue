<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { hasKeyring, setupPin } from '../lib/crypto/keyring'
import { isPlatformAuthenticatorAvailable, setupBiometric } from '../lib/crypto/webauthn'
import { useUnlockSession } from '../lib/crypto/session'
import PinUnlockForm from './PinUnlockForm.vue'

const { isUnlocked, unlock } = useUnlockSession()

type Mode = 'loading' | 'setup' | 'biometric-offer' | 'unlock'
const mode = ref<Mode>('loading')

const pin = ref('')
const confirmPin = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

// Holds the freshly-generated DEK between PIN setup and the biometric offer
// step — the offer is skippable, but either way the DEK it was created with
// must be the one that gets unlocked, not a second freshly generated one.
const pendingDek = ref<Uint8Array | null>(null)

onMounted(async () => {
  mode.value = (await hasKeyring()) ? 'unlock' : 'setup'
})

async function enableBiometric() {
  if (!pendingDek.value) return
  busy.value = true
  try {
    if (!(await setupBiometric(pendingDek.value))) {
      error.value = 'Kon niet worden ingeschakeld op dit toestel. Je pincode werkt gewoon.'
    }
  } finally {
    busy.value = false
    unlock(pendingDek.value)
    pendingDek.value = null
  }
}

function skipBiometric() {
  if (pendingDek.value) unlock(pendingDek.value)
  pendingDek.value = null
}

function validPin(value: string): boolean {
  return /^\d{4,8}$/.test(value)
}

async function submitSetup() {
  error.value = null
  if (!validPin(pin.value)) {
    error.value = 'Kies een pincode van 4 tot 8 cijfers.'
    return
  }
  if (pin.value !== confirmPin.value) {
    error.value = 'De pincodes komen niet overeen.'
    return
  }
  busy.value = true
  try {
    const dek = await setupPin(pin.value)
    if (await isPlatformAuthenticatorAvailable()) {
      pendingDek.value = dek
      mode.value = 'biometric-offer'
    } else {
      unlock(dek)
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="!isUnlocked && mode !== 'loading'" class="overlay">
    <div class="dialog">
      <template v-if="mode === 'setup'">
        <h2 class="title">Beveiliging instellen</h2>
        <p class="sub">
          Je gegevens staan straks versleuteld op dit toestel. Kies een pincode om ze te ontgrendelen — zonder
          pincode kun je niet meer bij je data, dus bewaar 'm goed.
        </p>
        <form class="pin-form" novalidate @submit.prevent="submitSetup">
          <input
            v-model="pin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Pincode (4-8 cijfers)"
            class="input"
            autocomplete="new-password"
          />
          <input
            v-model="confirmPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Herhaal pincode"
            class="input"
            autocomplete="new-password"
          />
          <p v-if="error" class="error-line">{{ error }}</p>
          <button type="submit" class="primary-button" :disabled="busy">Instellen</button>
        </form>
      </template>

      <template v-else-if="mode === 'biometric-offer'">
        <h2 class="title">Vingerafdruk of gezicht gebruiken?</h2>
        <p class="sub">
          Optioneel, naast je pincode — die blijft altijd werken, ook als dit toestel geen biometrie ondersteunt.
        </p>
        <p v-if="error" class="error-line">{{ error }}</p>
        <button type="button" class="primary-button" :disabled="busy" @click="enableBiometric">Inschakelen</button>
        <button type="button" class="link-button" :disabled="busy" @click="skipBiometric">Overslaan</button>
      </template>

      <template v-else-if="mode === 'unlock'">
        <h2 class="title">Ontgrendelen</h2>
        <PinUnlockForm @unlocked="unlock" />
      </template>
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
  z-index: 1100;
  padding: 20px;
}

.dialog {
  background: var(--card);
  border-radius: var(--radius-panel-lg);
  box-shadow: var(--shadow-lg);
  padding: 32px;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--ink-deep);
}

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

.link-button {
  border: none;
  background: none;
  color: var(--color-neutral-700);
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
  padding: 4px 0;
  align-self: center;
}

.link-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
