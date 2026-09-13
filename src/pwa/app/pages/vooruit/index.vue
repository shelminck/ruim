<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { loadWaterfall } from '../../composables/useWaterfall'
import { getBuffer, saveBuffer } from '../../lib/db/buffer'
import { createGoal, listGoals } from '../../lib/db/goals'
import type { Buffer, Goal } from '../../lib/domain/types'
import type { WaterfallResult } from '../../lib/domain/waterfall'

useScreenHeader().set('Vooruit', 'buffer, doelen en beleggen')

const buffer = ref<Buffer | null>(null)
const waterfall = ref<WaterfallResult | null>(null)
const goals = ref<Goal[]>([])
const bufferSavedInput = ref('')
const bufferContributionInput = ref('')

const showCreateForm = ref(false)
const newName = ref('')
const newTarget = ref('')
const newTargetDate = ref('')
const newMonthlyDeposit = ref('')

async function load() {
  const [b, wf, g] = await Promise.all([getBuffer(), loadWaterfall(), listGoals()])
  buffer.value = b
  waterfall.value = wf
  goals.value = g
  bufferSavedInput.value = (b.savedCents / 100).toString()
  bufferContributionInput.value = (b.monthlyContributionCents / 100).toString()
}

onMounted(load)

const bufferGoalMonths = 6
const bufferMonthsCovered = computed(() => {
  if (!waterfall.value || !buffer.value || waterfall.value.lastenMnd <= 0) return 0
  return buffer.value.savedCents / waterfall.value.lastenMnd
})
const bufferProgressPct = computed(() => Math.min(100, (bufferMonthsCovered.value / bufferGoalMonths) * 100))

async function saveBufferSettings() {
  if (!buffer.value) return
  const savedCents = Math.round(Number(bufferSavedInput.value.replace(',', '.')) * 100)
  const monthlyContributionCents = Math.round(Number(bufferContributionInput.value.replace(',', '.')) * 100)
  if (!Number.isFinite(savedCents) || !Number.isFinite(monthlyContributionCents)) return
  await saveBuffer({ id: 'buffer', savedCents, monthlyContributionCents })
  await load()
}

function goalProgressPct(goal: Goal): number {
  return goal.targetCents > 0 ? Math.min(100, (goal.savedCents / goal.targetCents) * 100) : 0
}

async function submitCreateGoal() {
  const targetCents = Math.round(Number(newTarget.value.replace(',', '.')) * 100)
  const monthlyDepositCents = Math.round(Number(newMonthlyDeposit.value.replace(',', '.')) * 100)
  if (!newName.value.trim() || !Number.isFinite(targetCents) || targetCents <= 0) return

  await createGoal({
    name: newName.value.trim(),
    targetCents,
    targetDate: newTargetDate.value || null,
    monthlyDepositCents: Number.isFinite(monthlyDepositCents) ? monthlyDepositCents : 0,
    accountLabel: '',
    transferDay: 26,
  })
  newName.value = ''
  newTarget.value = ''
  newTargetDate.value = ''
  newMonthlyDeposit.value = ''
  showCreateForm.value = false
  await load()
}
</script>

<template>
  <div class="vooruit-screen">
    <div class="priority-item">
      <div class="priority-number">1</div>
      <div class="priority-body">
        <h2 class="priority-title">Buffer</h2>
        <div class="progress-track">
          <div class="progress-fill progress-fill--buffer" :style="{ width: `${bufferProgressPct}%` }" />
        </div>
        <p class="priority-sub">
          {{ bufferMonthsCovered.toFixed(1).replace('.', ',') }} van de {{ bufferGoalMonths }} maanden lasten
          <template v-if="buffer && buffer.monthlyContributionCents > 0">
            · {{ formatEuros(buffer.monthlyContributionCents) }} per maand
          </template>
        </p>

        <form class="inline-form" @submit.prevent="saveBufferSettings">
          <label class="field">
            <span>Buffersaldo (€)</span>
            <input v-model="bufferSavedInput" type="text" inputmode="decimal" class="input" />
          </label>
          <label class="field">
            <span>Inleg per maand (€)</span>
            <input v-model="bufferContributionInput" type="text" inputmode="decimal" class="input" />
          </label>
          <button type="submit" class="primary-button">Opslaan</button>
        </form>
      </div>
    </div>

    <div class="priority-item">
      <div class="priority-number">2</div>
      <div class="priority-body">
        <h2 class="priority-title">Doelen</h2>

        <NuxtLink v-for="goal in goals" :key="goal.id" :to="`/vooruit/doel/${goal.id}`" class="goal-row">
          <div class="goal-row-text">
            <span>{{ goal.name }}</span>
            <span>{{ formatEuros(goal.savedCents) }} / {{ formatEuros(goal.targetCents) }}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill progress-fill--goal" :style="{ width: `${goalProgressPct(goal)}%` }" />
          </div>
        </NuxtLink>

        <div class="create-section">
          <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
            + Doel toevoegen
          </button>
          <form v-else class="create-form" @submit.prevent="submitCreateGoal">
            <input v-model="newName" type="text" placeholder="Naam, bijv. Vakantie Italië" class="input" required />
            <input v-model="newTarget" type="text" inputmode="decimal" placeholder="Doelbedrag" class="input" required />
            <input v-model="newTargetDate" type="date" class="input" />
            <input v-model="newMonthlyDeposit" type="text" inputmode="decimal" placeholder="Inleg per maand" class="input" />
            <div class="create-actions">
              <button type="submit" class="primary-button">Toevoegen</button>
              <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="priority-item">
      <div class="priority-number">3</div>
      <div class="priority-body">
        <h2 class="priority-title">Beleggen</h2>
        <NuxtLink to="/vooruit/beleggen" class="link-row">Bekijk inleg en koerswinst ›</NuxtLink>
      </div>
    </div>

    <p class="footnote">De buffer gaat voor. Doelen schuiven op in een krappe maand; beleggen blijft staan.</p>
  </div>
</template>

<style scoped>
.vooruit-screen {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 700px;
}

.priority-item {
  display: flex;
  gap: 16px;
}

.priority-number {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.priority-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.priority-title {
  font-size: 17px;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: var(--color-neutral-200);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
}

.progress-fill--buffer {
  background: var(--ink);
}

.progress-fill--goal {
  background: var(--color-accent);
}

.priority-sub {
  font-size: 12.5px;
  color: var(--color-neutral-700);
  margin: 0;
}

.inline-form {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 6px;
}

@media (max-width: 1100px) {
  .inline-form {
    flex-wrap: wrap;
  }

  .field {
    flex: 1 1 140px;
    min-width: 0;
  }

  .primary-button {
    flex: none;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11.5px;
  color: var(--color-neutral-700);
}

.field .input {
  width: 100%;
}

.input {
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 13px;
}

.primary-button {
  border: none;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 13px;
  border-radius: 999px;
  padding: 9px 16px;
  cursor: pointer;
  height: 36px;
}

.goal-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--card);
  border-radius: var(--radius-row);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
}

.goal-row-text {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
}

.link-row {
  font-size: 13.5px;
  color: var(--color-accent);
  text-decoration: none;
}

.create-section {
  display: flex;
  margin-top: 4px;
}

.ghost-button {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-family: var(--font-heading);
  font-size: 13.5px;
  cursor: pointer;
  padding: 6px 4px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--card);
  border-radius: var(--radius-card);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  max-width: 320px;
}

.create-actions {
  display: flex;
  gap: 10px;
}

.footnote {
  font-size: 12.5px;
  color: var(--color-neutral-600);
}
</style>
