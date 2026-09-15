<script setup lang="ts">
import { useReauthGuard } from '../composables/useReauthGuard'
import PinUnlockForm from './PinUnlockForm.vue'

const { pendingReason, confirm, cancel } = useReauthGuard()
</script>

<template>
  <div v-if="pendingReason" class="overlay">
    <div class="dialog">
      <h2 class="title">Nog even bevestigen</h2>
      <p class="sub">{{ pendingReason }} — voer je pincode nogmaals in, ook al ben je al ontgrendeld.</p>
      <PinUnlockForm @unlocked="confirm" />
      <button type="button" class="link-button" @click="cancel">Annuleren</button>
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
  z-index: 1300;
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
  font-size: 20px;
  color: var(--ink-deep);
}

.sub {
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--color-neutral-700);
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
</style>
