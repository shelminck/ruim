<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatEuros } from '../lib/domain/format'
import type { Subscription } from '../lib/domain/types'
import { createSubscription, listSubscriptions, toggleSubscriptionCancelled } from '../lib/db/subscriptions'
import { useSidebarValues } from '../composables/useSidebarValues'
import { useTeDoenCount } from '../composables/useTeDoenCount'

useScreenHeader().set('Abonnementen', 'Actieve en opgezegde abonnementen.')

const { refresh: refreshSidebarValues } = useSidebarValues()
const { refresh: refreshTeDoenCount } = useTeDoenCount()

const subscriptions = ref<Subscription[]>([])
const showCreateForm = ref(false)
const newName = ref('')
const newAmount = ref('')

async function load() {
  subscriptions.value = await listSubscriptions()
}

onMounted(load)

async function toggle(subscription: Subscription) {
  await toggleSubscriptionCancelled(subscription)
  await load()
  await refreshSidebarValues()
  await refreshTeDoenCount()
}

async function submitCreate() {
  const amountCents = Math.round(Number(newAmount.value.replace(',', '.')) * 100)
  if (!newName.value.trim() || !Number.isFinite(amountCents) || amountCents <= 0) return
  await createSubscription({ name: newName.value.trim(), amountCents })
  newName.value = ''
  newAmount.value = ''
  showCreateForm.value = false
  await load()
  await refreshSidebarValues()
}
</script>

<template>
  <div class="abonnementen-screen">
    <div class="grid">
      <button
        v-for="subscription in subscriptions"
        :key="subscription.id"
        type="button"
        class="card"
        :class="{ 'card--cancelled': subscription.cancelledAt !== null }"
        @click="toggle(subscription)"
      >
        <div class="card-name">{{ subscription.name }}</div>
        <div class="card-amount">{{ formatEuros(subscription.amountCents) }}</div>
        <div v-if="subscription.cancelledAt" class="card-meta">opgezegd · bespaart {{ formatEuros(subscription.amountCents) }}</div>
        <div v-else class="card-meta">per maand · tik om op te zeggen</div>
      </button>
    </div>

    <div class="create-section">
      <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
        + Abonnement toevoegen
      </button>
      <form v-else class="create-form" @submit.prevent="submitCreate">
        <input v-model="newName" type="text" placeholder="Naam, bijv. Netflix" class="input" required />
        <input v-model="newAmount" type="text" inputmode="decimal" placeholder="Bedrag per maand" class="input" required />
        <div class="create-actions">
          <button type="submit" class="primary-button">Toevoegen</button>
          <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.abonnementen-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--card);
  border: none;
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 18px;
  text-align: left;
  cursor: pointer;
}

.card--cancelled {
  background: var(--color-neutral-100);
  opacity: 0.55;
  box-shadow: none;
}

.card-name {
  font-family: var(--font-heading);
  font-size: 16px;
}

.card-amount {
  font-size: 20px;
  font-family: var(--font-heading);
}

.card-meta {
  font-size: 11.5px;
  color: var(--color-neutral-600);
}

.create-section {
  display: flex;
}

.ghost-button {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-family: var(--font-heading);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 4px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  max-width: 360px;
}

.input {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 14px;
}

.create-actions {
  display: flex;
  gap: 10px;
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
</style>
