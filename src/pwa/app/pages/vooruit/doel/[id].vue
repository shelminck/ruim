<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatEuros } from '../../../lib/domain/format'
import { getGoal, removeGoal, updateGoal } from '../../../lib/db/goals'
import { loadWaterfall } from '../../../composables/useWaterfall'
import type { Goal } from '../../../lib/domain/types'

const route = useRoute()
const router = useRouter()

const screenHeader = useScreenHeader()
screenHeader.set('Doel', '', { back: { to: '/vooruit', label: 'Vooruit' } })

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
  screenHeader.set(found.name, `doel · ${formatEuros(found.targetCents)}`, {
    back: { to: '/vooruit', label: 'Vooruit' },
  })
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
      <div class="saldo-card">
        <label class="saldo-field">
          <span class="saldo-currency">€</span>
          <input v-model="savedInput" type="text" inputmode="decimal" class="saldo-input" @blur="saveSaved" />
        </label>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
        </div>
        <div class="remaining-line">
          <template v-if="remainingCents > 0">nog {{ formatEuros(remainingCents) }} te gaan</template>
          <template v-else>doel behaald</template>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-row">
          <span>Staat op</span>
          <input v-model="accountLabelInput" type="text" placeholder="Spaarrekening · NL··8842" class="input" @blur="saveSettings" />
        </div>
        <div class="settings-row">
          <span>Overboeking</span>
          <span>automatisch · <input v-model="transferDayInput" type="text" class="input input--small" @blur="saveSettings" />e</span>
        </div>
        <button type="button" class="settings-row settings-row--button" @click="togglePause">
          <span>Pauzeren bij te weinig inkomen</span>
          <span class="toggle-value" :class="{ 'toggle-value--on': goal.pauseWhenIncomeLow }">
            {{ goal.pauseWhenIncomeLow ? 'aan ✓' : 'uit' }}
          </span>
        </button>
      </div>

      <button type="button" class="text-button" @click="deleteAndReturn">Doel verwijderen</button>
    </div>

    <div class="right-column">
      <div class="deposit-row">
        <span>Inleg per maand</span>
        <span class="deposit-figure">{{ formatEuros(goal.monthlyDepositCents) }}</span>
      </div>
      <input
        type="range"
        min="5000"
        max="30000"
        step="1000"
        class="deposit-slider"
        :value="goal.monthlyDepositCents"
        @input="onDepositChange"
      />
      <p v-if="readyLine" class="ready-line">{{ readyLine }}</p>
      <p class="vrij-line">en je vrij te besteden wordt {{ formatEuros(vrijTeBesteden) }} per maand</p>
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
  max-width: 1020px;
}

@media (max-width: 1100px) {
  .doel-screen {
    grid-template-columns: 1fr;
  }
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.saldo-card {
  background: var(--card);
  box-shadow: var(--shadow-sm);
  border-radius: 30px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.saldo-field {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-heading);
  font-size: 38px;
  line-height: 1;
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

.settings-card {
  background: var(--card);
  box-shadow: var(--shadow-sm);
  border-radius: 28px;
  padding: 4px 24px;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border: none;
  background: transparent;
  padding: 15px 0;
  border-bottom: 1px solid var(--color-neutral-200);
  font-size: 14px;
  cursor: default;
  text-align: left;
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-row--button {
  cursor: pointer;
}

.toggle-value {
  color: var(--color-neutral-700);
}

.toggle-value--on {
  color: var(--ink);
}

.input {
  min-height: 32px;
  width: 180px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 13px;
  color: var(--color-neutral-700);
  text-align: right;
}

.input--small {
  width: 36px;
  text-align: center;
  margin-right: 4px;
}

.text-button {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent-700);
  cursor: pointer;
  font-size: 12.5px;
}

.right-column {
  background: var(--soft);
  border-radius: 30px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: start;
}

.deposit-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 14px;
  color: var(--color-neutral-800);
}

.deposit-figure {
  font-family: var(--font-heading);
  font-size: 28px;
  color: var(--color-accent-700);
}

.deposit-slider {
  accent-color: var(--color-accent);
  height: 22px;
  width: 100%;
}

.ready-line {
  font-size: 13.5px;
  color: var(--color-neutral-800);
  margin: 0;
}

.vrij-line {
  font-size: 13px;
  color: var(--color-neutral-700);
  margin: 0;
}
</style>
