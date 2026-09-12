<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { currentMonthKey, envelopeProgress, spentCentsForEnvelope } from '../../lib/domain/budget'
import { formatEuros } from '../../lib/domain/format'
import type { Envelope, RolloverPolicy } from '../../lib/domain/types'
import { getEnvelope, removeEnvelope, updateEnvelope } from '../../lib/db/envelopes'
import { getDb } from '../../lib/db/client'

const route = useRoute()
const router = useRouter()

const envelope = ref<Envelope | null>(null)
const spentCents = ref(0)
const budgetInput = ref('')
const carriedOverInput = ref('')

useScreenHeader().set('Potje', 'Budget, meegenomen rest en de doorschuif-regel voor dit potje.')

async function load() {
  const id = String(route.params.id)
  const [found, db] = await Promise.all([getEnvelope(id), getDb()])
  if (!found) {
    envelope.value = null
    return
  }
  envelope.value = found
  budgetInput.value = (found.budgetCents / 100).toString()
  carriedOverInput.value = (found.carriedOverCents / 100).toString()

  const transactions = await db.getAll('transactions')
  spentCents.value = spentCentsForEnvelope(transactions, found.id, currentMonthKey())
}

onMounted(load)
watch(() => route.params.id, load)

const progress = computed(() => (envelope.value ? envelopeProgress(envelope.value, spentCents.value) : null))

const rolloverOptions: { value: RolloverPolicy; title: string; sub: string }[] = [
  { value: 'carry-over', title: 'Schuift door naar volgende maand', sub: 'max. 1 maand meenemen' },
  { value: 'reset', title: 'Valt weg, elke maand schoon', sub: 'strakker, maar straft een zuinige maand af' },
  { value: 'to-savings-goal', title: 'Rest gaat naar spaarpotje', sub: 'geld verdwijnt niet, maar is niet meer vrij' },
]

async function saveBudget() {
  if (!envelope.value) return
  const budgetCents = Math.round(Number(budgetInput.value.replace(',', '.')) * 100)
  const carriedOverCents = Math.round(Number(carriedOverInput.value.replace(',', '.')) * 100)
  if (!Number.isFinite(budgetCents) || !Number.isFinite(carriedOverCents)) return

  envelope.value = { ...envelope.value, budgetCents, carriedOverCents }
  await updateEnvelope(envelope.value)
  await load()
}

async function selectRollover(policy: RolloverPolicy) {
  if (!envelope.value) return
  envelope.value = { ...envelope.value, rolloverPolicy: policy }
  await updateEnvelope(envelope.value)
}

async function deleteAndReturn() {
  if (!envelope.value) return
  await removeEnvelope(envelope.value.id)
  await router.push('/potjes')
}
</script>

<template>
  <div v-if="!envelope" class="not-found">Dit potje bestaat niet (meer).</div>

  <div v-else class="potje-screen">
    <div class="arithmetic-panel">
      <div class="row">
        <span>Budget per maand</span>
        <span>{{ formatEuros(envelope.budgetCents) }}</span>
      </div>
      <div class="row">
        <span>Meegenomen van vorige maand</span>
        <span>{{ formatEuros(envelope.carriedOverCents) }}</span>
      </div>
      <div class="row">
        <span>Besteed deze maand</span>
        <span>{{ formatEuros(-spentCents) }}</span>
      </div>
      <div class="divider" />
      <div class="row row--total">
        <span>Nog te besteden</span>
        <span>{{ progress ? formatEuros(progress.remainingCents) : '—' }}</span>
      </div>

      <form class="edit-form" @submit.prevent="saveBudget">
        <label class="field">
          <span>Budget (€/maand)</span>
          <input v-model="budgetInput" type="text" inputmode="decimal" class="input" />
        </label>
        <label class="field">
          <span>Meegenomen (€)</span>
          <input v-model="carriedOverInput" type="text" inputmode="decimal" class="input" />
        </label>
        <button type="submit" class="primary-button">Opslaan</button>
      </form>
    </div>

    <div class="rollover-panel">
      <h2 class="rollover-title">Als er iets overblijft</h2>
      <div class="rollover-list">
        <label
          v-for="option in rolloverOptions"
          :key="option.value"
          class="rollover-row"
          :class="{ 'rollover-row--selected': envelope.rolloverPolicy === option.value }"
        >
          <input
            type="radio"
            name="rollover"
            :value="option.value"
            :checked="envelope.rolloverPolicy === option.value"
            @change="selectRollover(option.value)"
          />
          <span class="dot" />
          <span class="rollover-text">
            <strong>{{ option.title }}</strong>
            <small>{{ option.sub }}</small>
          </span>
        </label>
      </div>

      <p class="footnote">Een tekort schuift altijd door — anders verdampt overbesteding stilletjes.</p>

      <button type="button" class="text-button" @click="deleteAndReturn">Potje verwijderen</button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--color-neutral-700);
}

.potje-screen {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 900px;
}

@media (max-width: 1100px) {
  .potje-screen {
    grid-template-columns: 1fr;
  }
}

.arithmetic-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--ink-deep);
}

.divider {
  height: 1px;
  background: color-mix(in srgb, var(--ink-deep) 16%, transparent);
  margin: 4px 0;
}

.row--total {
  font-family: var(--font-heading);
  font-size: 28px;
  color: var(--color-accent-700);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--ink-deep);
}

.input {
  min-height: 38px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 14px;
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

.primary-button:hover {
  background: var(--ink-deep);
}

.rollover-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rollover-title {
  font-size: 17px;
}

.rollover-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rollover-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-row);
  border: 1px solid var(--color-neutral-300);
  cursor: pointer;
  font-size: 14px;
}

.rollover-row input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.rollover-row .dot {
  width: 16px;
  height: 16px;
  flex: none;
  border-radius: 999px;
  border: 1.5px solid var(--color-neutral-400);
}

.rollover-row--selected {
  background: var(--color-accent-100);
  border-color: transparent;
}

.rollover-row--selected .dot {
  border: 5px solid var(--color-accent);
}

.rollover-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rollover-text small {
  color: var(--color-neutral-600);
  font-size: 12px;
}

.footnote {
  font-size: 12.5px;
  color: var(--color-neutral-600);
}

.text-button {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent-700);
  cursor: pointer;
  font-size: 12.5px;
}
</style>
