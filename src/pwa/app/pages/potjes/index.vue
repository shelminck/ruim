<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listAccounts } from '../../lib/db/accounts'
import { aggregateProgress, currentMonthKey, envelopeProgress, spentCentsForEnvelope, type Stand } from '../../lib/domain/budget'
import type { Account, Envelope, RolloverPolicy } from '../../lib/domain/types'
import { createEnvelope, listEnvelopes, removeEnvelope } from '../../lib/db/envelopes'
import { getDb } from '../../lib/db/client'
import { formatEuros } from '../../lib/domain/format'

useScreenHeader().set('Potjes', 'Je maandelijkse envelopes: budget, besteed en wat nog rest.')

const envelopes = ref<Envelope[]>([])
const accounts = ref<Account[]>([])
const spentByEnvelope = ref<Record<string, number>>({})
const showCreateForm = ref(false)

const newName = ref('')
const newBudget = ref('')
const newAccountId = ref('')
const newRollover = ref<RolloverPolicy>('carry-over')

async function load() {
  const [db, allEnvelopes, allAccounts] = await Promise.all([getDb(), listEnvelopes(), listAccounts()])
  const transactions = await db.getAll('transactions')
  const month = currentMonthKey()

  envelopes.value = allEnvelopes
  accounts.value = allAccounts
  spentByEnvelope.value = Object.fromEntries(
    allEnvelopes.map((e) => [e.id, spentCentsForEnvelope(transactions, e.id, month)]),
  )
  if (!newAccountId.value && allAccounts[0]) newAccountId.value = allAccounts[0].id
}

onMounted(load)

const progressList = computed(() =>
  envelopes.value.map((envelope) => ({
    envelope,
    progress: envelopeProgress(envelope, spentByEnvelope.value[envelope.id] ?? 0),
  })),
)

const monthStand = computed(() => aggregateProgress(progressList.value.map((p) => p.progress)))
const overspentCount = computed(() => progressList.value.filter((p) => p.progress.remainingCents < 0).length)

const legend: { stand: Stand; label: string }[] = [
  { stand: 'ruim', label: 'Ruim — nog volop ruimte' },
  { stand: 'krap', label: 'Krap — boven de 75%' },
  { stand: 'op', label: 'Op — budget bereikt of overschreden' },
]

async function submitCreate() {
  const budgetCents = Math.round(Number(newBudget.value.replace(',', '.')) * 100)
  if (!newName.value.trim() || !newAccountId.value || !Number.isFinite(budgetCents) || budgetCents <= 0) return

  await createEnvelope({
    name: newName.value.trim(),
    accountId: newAccountId.value,
    budgetCents,
    rolloverPolicy: newRollover.value,
  })
  newName.value = ''
  newBudget.value = ''
  showCreateForm.value = false
  await load()
}

async function deleteEnvelope(id: string) {
  await removeEnvelope(id)
  await load()
}
</script>

<template>
  <div class="potjes-screen">
    <div class="summary-panel">
      <div class="summary-label">samen nog in je potjes</div>
      <div class="summary-figure">{{ formatEuros(monthStand.remainingCents) }}</div>
      <div class="summary-sub">
        {{ envelopes.length }} {{ envelopes.length === 1 ? 'potje' : 'potjes' }}
        <template v-if="overspentCount > 0"> · {{ overspentCount }} in het rood</template>
      </div>
    </div>

    <div class="grid">
      <NuxtLink v-for="{ envelope, progress } in progressList" :key="envelope.id" :to="`/potjes/${envelope.id}`" class="card">
        <div class="card-top">
          <Merkteken :stand="progress.stand" :size="30" />
          <div class="card-title-group">
            <div class="card-name">{{ envelope.name }}</div>
            <div class="card-remaining" :class="{ 'card-remaining--over': progress.remainingCents < 0 }">
              {{ formatEuros(progress.remainingCents) }}
            </div>
          </div>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill"
            :class="`progress-fill--${progress.stand}`"
            :style="{ width: `${Math.min(100, progress.ratio * 100)}%` }"
          />
        </div>

        <div class="card-footer">
          <span v-if="envelope.carriedOverCents > 0">incl. {{ formatEuros(envelope.carriedOverCents) }} meegenomen</span>
          <span>{{ formatEuros(progress.spentCents) }} van {{ formatEuros(progress.effectiveBudgetCents) }}</span>
        </div>
      </NuxtLink>

      <div class="card card--vooruit">
        <div class="card-title-group">
          <div class="card-name">Vooruit</div>
          <div class="card-remaining">{{ formatEuros(0) }}</div>
        </div>
        <p class="card-note">Buffer, doelen en beleggen volgen in een latere bouwstap.</p>
      </div>
    </div>

    <div class="legend-card">
      <div v-for="item in legend" :key="item.stand" class="legend-row" :class="{ 'legend-row--dim': item.stand !== monthStand.stand }">
        <Merkteken :stand="item.stand" :size="26" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <p class="footnote">Een potje is geen rekening — het is een afspraak met jezelf over deze maand.</p>

    <div class="create-section">
      <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
        + Nieuw potje
      </button>

      <form v-else class="create-form" @submit.prevent="submitCreate">
        <input v-model="newName" type="text" placeholder="Naam, bijv. Boodschappen" class="input" required />
        <input v-model="newBudget" type="text" inputmode="decimal" placeholder="Budget per maand, bijv. 300" class="input" required />
        <select v-model="newAccountId" class="input" required>
          <option v-if="accounts.length === 0" value="" disabled>Eerst een rekening importeren</option>
          <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
        </select>
        <select v-model="newRollover" class="input">
          <option value="carry-over">Schuift door naar volgende maand</option>
          <option value="reset">Valt weg, elke maand schoon</option>
          <option value="to-savings-goal">Rest gaat naar een spaarpotje</option>
        </select>
        <div class="create-actions">
          <button type="submit" class="primary-button" :disabled="accounts.length === 0">Aanmaken</button>
          <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
        </div>
      </form>
    </div>

    <ul v-if="envelopes.length > 0" class="manage-list">
      <li v-for="envelope in envelopes" :key="envelope.id">
        <span>{{ envelope.name }}</span>
        <button type="button" class="text-button" @click="deleteEnvelope(envelope.id)">Verwijderen</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.potjes-screen {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
}

.summary-panel {
  background: var(--ink);
  color: #fff;
  border-radius: var(--radius-panel-lg);
  padding: 30px 32px;
}

.summary-label {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.82);
}

.summary-figure {
  font-family: var(--font-heading);
  font-size: 40px;
  margin-top: 6px;
}

.summary-sub {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  text-decoration: none;
  color: inherit;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card--vooruit {
  background: var(--soft);
  box-shadow: none;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-name {
  font-size: 14px;
  color: var(--color-neutral-700);
}

.card-remaining {
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--ink-deep);
}

.card-remaining--over {
  color: var(--color-accent-700);
}

.card-note {
  font-size: 12.5px;
  color: var(--color-neutral-700);
  margin: 0;
}

.progress-track {
  height: 10px;
  border-radius: 999px;
  background: var(--color-neutral-200);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
}

.progress-fill--ruim {
  background: var(--ink);
}

.progress-fill--krap {
  background: var(--color-accent);
}

.progress-fill--op {
  background: var(--color-text);
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--color-neutral-600);
}

.legend-card {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  background: var(--card);
  border-radius: var(--radius-card);
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.legend-row--dim {
  opacity: 0.42;
}

.footnote {
  font-size: 12.5px;
  color: var(--color-neutral-600);
  margin: 0;
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

.ghost-button:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  border-radius: 999px;
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
  background: var(--color-surface, #fff);
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

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button:hover:not(:disabled) {
  background: var(--ink-deep);
}

.manage-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manage-list li {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 4px;
  color: var(--color-neutral-700);
}

.text-button {
  border: none;
  background: transparent;
  color: var(--color-accent-700);
  cursor: pointer;
  font-size: 12.5px;
}
</style>
