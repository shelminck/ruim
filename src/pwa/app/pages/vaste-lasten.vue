<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../lib/domain/format'
import type { FixedCost } from '../lib/domain/types'
import { createFixedCost, listFixedCosts, removeFixedCost } from '../lib/db/fixed-costs'
import { listSubscriptions } from '../lib/db/subscriptions'
import { listIncomeSources } from '../lib/db/income-sources'

useScreenHeader().set('Vaste lasten', 'Wat er elke maand vanaf gaat.')

const fixedCosts = ref<FixedCost[]>([])
const subscriptionTotal = ref(0)
const basis = ref(0)
const showCreateForm = ref(false)
const newName = ref('')
const newGroup = ref('')
const newAmount = ref('')

async function load() {
  const [costs, subscriptions, incomeSources] = await Promise.all([
    listFixedCosts(),
    listSubscriptions(),
    listIncomeSources(),
  ])
  fixedCosts.value = costs
  subscriptionTotal.value = subscriptions.filter((s) => s.cancelledAt === null).reduce((sum, s) => sum + s.amountCents, 0)
  basis.value = incomeSources.filter((s) => s.countsTowardBase).reduce((sum, s) => sum + s.amountCents, 0)
}

onMounted(load)

const fixedCostsTotal = computed(() => fixedCosts.value.reduce((sum, c) => sum + c.amountCents, 0))
const total = computed(() => fixedCostsTotal.value + subscriptionTotal.value)
const yearlyTotal = computed(() => total.value * 12)
const percentOfBase = computed(() => (basis.value > 0 ? Math.round((total.value / basis.value) * 100) : null))

const groups = computed(() => {
  const map = new Map<string, number>()
  for (const cost of fixedCosts.value) {
    map.set(cost.group, (map.get(cost.group) ?? 0) + cost.amountCents)
  }
  return [...map.entries()].map(([group, amountCents]) => ({ group, amountCents }))
})

function costsInGroup(group: string): FixedCost[] {
  return fixedCosts.value.filter((c) => c.group === group)
}

async function submitCreate() {
  const amountCents = Math.round(Number(newAmount.value.replace(',', '.')) * 100)
  if (!newName.value.trim() || !newGroup.value.trim() || !Number.isFinite(amountCents) || amountCents <= 0) return
  await createFixedCost({ name: newName.value.trim(), group: newGroup.value.trim(), amountCents })
  newName.value = ''
  newGroup.value = ''
  newAmount.value = ''
  showCreateForm.value = false
  await load()
}

async function deleteCost(id: string) {
  await removeFixedCost(id)
  await load()
}
</script>

<template>
  <div class="vaste-lasten-screen">
    <div class="summary-panel">
      <div class="summary-label">gaat er elke maand vanaf</div>
      <div class="summary-figure">{{ formatEuros(total) }}</div>
      <div class="summary-sub">
        {{ formatEuros(yearlyTotal) }} per jaar
        <template v-if="percentOfBase !== null"> · {{ percentOfBase }}% van je basisinkomen</template>
      </div>
    </div>

    <div class="groups-column">
      <div v-for="g in groups" :key="g.group" class="group-card">
        <div class="group-header">
          <span>{{ g.group }}</span>
          <span>{{ formatEuros(g.amountCents) }}</span>
        </div>
        <ul class="group-items">
          <li v-for="cost in costsInGroup(g.group)" :key="cost.id">
            <span>{{ cost.name }}</span>
            <span>{{ formatEuros(cost.amountCents) }}</span>
            <button type="button" class="text-button" @click="deleteCost(cost.id)">Verwijderen</button>
          </li>
        </ul>
      </div>

      <NuxtLink to="/abonnementen" class="group-card group-card--link">
        <div class="group-header">
          <span>Abonnementen</span>
          <span>{{ formatEuros(subscriptionTotal) }} ›</span>
        </div>
      </NuxtLink>

      <div class="create-section">
        <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
          + Vaste last toevoegen
        </button>
        <form v-else class="create-form" @submit.prevent="submitCreate">
          <input v-model="newName" type="text" placeholder="Naam, bijv. Huur" class="input" required />
          <input v-model="newGroup" type="text" placeholder="Groep, bijv. Wonen" class="input" required />
          <input v-model="newAmount" type="text" inputmode="decimal" placeholder="Bedrag per maand" class="input" required />
          <div class="create-actions">
            <button type="submit" class="primary-button">Toevoegen</button>
            <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vaste-lasten-screen {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 24px;
  max-width: 900px;
  align-items: start;
}

.summary-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 30px;
}

.summary-label {
  font-size: 13.5px;
  color: var(--ink-deep);
}

.summary-figure {
  font-family: var(--font-heading);
  font-size: 46px;
  color: var(--color-accent-700);
  margin-top: 4px;
}

.summary-sub {
  font-size: 12.5px;
  color: var(--color-neutral-700);
  margin-top: 6px;
}

.groups-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.group-card {
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
  text-decoration: none;
  color: inherit;
  display: block;
}

.group-card--link:hover {
  box-shadow: var(--shadow-md);
}

.group-header {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-heading);
  font-size: 15px;
}

.group-items {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-items li {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.group-items li span:first-child {
  flex: 1;
}

.text-button {
  border: none;
  background: transparent;
  color: var(--color-accent-700);
  cursor: pointer;
  font-size: 11.5px;
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
