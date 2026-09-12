<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatEuros } from '../../../lib/domain/format'
import { getGoal, removeGoal, updateGoal } from '../../../lib/db/goals'
import { loadWaterfall } from '../../../composables/useWaterfall'
import type { Goal } from '../../../lib/domain/types'

const route = useRoute()
const router = useRouter()

useScreenHeader().set('Doel', 'Voortgang en instellingen voor dit doel.', {
  back: { to: '/vooruit', label: 'Vooruit' },
})

const goal = ref<Goal | null>(null)
const accountLabelInput = ref('')
const transferDayInput = ref('26')
const savedInput = ref('0')
const vrijTeBesteden = ref(0)

async function load() {
  const found = await getGoal(String(route.params.id))
  if (!found) {
    goal.value = null
    return
  }
  goal.value = found
  accountLabelInput.value = found.accountLabel
  transferDayInput.value = String(found.transferDay)
  savedInput.value = (found.savedCents / 100).toString()
  vrijTeBesteden.value = (await loadWaterfall()).vrij
}

onMounted(load)
watch(() => route.params.id, load)

const progressPct = computed(() => (goal.value && goal.value.targetCents > 0 ? Math.min(100, (goal.value.savedCents / goal.value.targetCents) * 100) : 0))
const remainingCents = computed(() => (goal.value ? goal.value.targetCents - goal.value.savedCents : 0))

const readyLine = computed(() => {
  if (!goal.value || goal.value.monthlyDepositCents <= 0 || remainingCents.value <= 0) return null
  const monthsLeft = Math.ceil(remainingCents.value / goal.value.monthlyDepositCents)
  const target = new Date()
  target.setMonth(target.getMonth() + monthsLeft)
  const label = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(target)
  return `klaar in ${label} · nog ${monthsLeft} inlegmaanden`
})

async function onDepositChange(event: Event) {
  if (!goal.value) return
  const monthlyDepositCents = Number((event.target as HTMLInputElement).value)
  goal.value = { ...goal.value, monthlyDepositCents }
  await updateGoal(goal.value)
  vrijTeBesteden.value = (await loadWaterfall()).vrij
}

async function saveSettings() {
  if (!goal.value) return
  const transferDay = Number(transferDayInput.value)
  goal.value = { ...goal.value, accountLabel: accountLabelInput.value, transferDay: Number.isFinite(transferDay) ? transferDay : goal.value.transferDay }
  await updateGoal(goal.value)
}

async function saveSaved() {
  if (!goal.value) return
  const savedCents = Math.round(Number(savedInput.value.replace(',', '.')) * 100)
  if (!Number.isFinite(savedCents)) return
  goal.value = { ...goal.value, savedCents }
  await updateGoal(goal.value)
}

async function togglePause() {
  if (!goal.value) return
  goal.value = { ...goal.value, pauseWhenIncomeLow: !goal.value.pauseWhenIncomeLow }
  await updateGoal(goal.value)
}

async function deleteAndReturn() {
  if (!goal.value) return
  await removeGoal(goal.value.id)
  await router.push('/vooruit')
}
</script>

<template>
  <div v-if="!goal" class="not-found">Dit doel bestaat niet (meer).</div>

  <div v-else class="doel-screen">
    <div class="left-column">
      <label class="saldo-field">
        <span class="saldo-currency">€</span>
        <input v-model="savedInput" type="text" inputmode="decimal" class="saldo-input" @blur="saveSaved" />
      </label>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
      </div>
      <div class="remaining-line">
        <template v-if="remainingCents > 0">nog {{ formatEuros(remainingCents) }} te gaan</template>
        <template v-else>doel behaald 🎉</template>
      </div>

      <ul class="settings-list">
        <li>
          <span>Staat op</span>
          <input v-model="accountLabelInput" type="text" placeholder="Spaarrekening · NL··8842" class="input" @blur="saveSettings" />
        </li>
        <li>
          <span>Overboeking</span>
          <span>automatisch · <input v-model="transferDayInput" type="text" class="input input--small" @blur="saveSettings" />e</span>
        </li>
        <li>
          <span>Pauzeren bij te weinig inkomen</span>
          <button type="button" class="toggle-button" @click="togglePause">
            {{ goal.pauseWhenIncomeLow ? 'aan ✓' : 'uit' }}
          </button>
        </li>
      </ul>

      <button type="button" class="text-button" @click="deleteAndReturn">Doel verwijderen</button>
    </div>

    <div class="right-column">
      <label class="field">
        <span>Inleg per maand: {{ formatEuros(goal.monthlyDepositCents) }}</span>
        <input
          type="range"
          min="5000"
          max="30000"
          step="1000"
          :value="goal.monthlyDepositCents"
          @input="onDepositChange"
        />
      </label>
      <p v-if="readyLine" class="ready-line">{{ readyLine }}</p>
      <div class="vrij-preview">
        <span>Je kunt dan nog uitgeven</span>
        <strong>{{ formatEuros(vrijTeBesteden) }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--color-neutral-700);
}

.doel-screen {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 900px;
}

@media (max-width: 1100px) {
  .doel-screen {
    grid-template-columns: 1fr;
  }
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.saldo-field {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-heading);
  font-size: 38px;
}

.saldo-input {
  border: none;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 38px;
  width: 160px;
  padding: 0;
}

.saldo-input:focus {
  outline: none;
}

.progress-track {
  height: 13px;
  border-radius: 999px;
  background: var(--color-neutral-200);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
}

.remaining-line {
  font-size: 13px;
  color: var(--color-neutral-700);
}

.settings-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  gap: 10px;
}

.input {
  min-height: 32px;
  width: 180px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 13px;
}

.input--small {
  width: 36px;
  text-align: center;
  margin-right: 4px;
}

.toggle-button {
  border: 1px solid var(--color-neutral-300);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12.5px;
  cursor: pointer;
}

.text-button {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent-700);
  cursor: pointer;
  font-size: 12.5px;
  margin-top: 8px;
}

.right-column {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: start;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13.5px;
  color: var(--ink-deep);
}

.field input[type='range'] {
  accent-color: var(--color-accent);
  height: 22px;
}

.ready-line {
  font-size: 12.5px;
  color: var(--color-neutral-700);
  margin: 0;
}

.vrij-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-deep);
}

.vrij-preview strong {
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-accent-700);
}
</style>
