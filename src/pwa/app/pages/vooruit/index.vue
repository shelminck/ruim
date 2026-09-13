<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { loadWaterfall } from '../../composables/useWaterfall'
import { getBuffer, saveBuffer } from '../../lib/db/buffer'
import { createGoal, listGoals } from '../../lib/db/goals'
import { getInvesting } from '../../lib/db/investing'
import type { Buffer, Goal, Investing } from '../../lib/domain/types'
import type { WaterfallResult } from '../../lib/domain/waterfall'

useScreenHeader().set('Vooruit', 'buffer, doelen en beleggen')

const buffer = ref<Buffer | null>(null)
const waterfall = ref<WaterfallResult | null>(null)
const goals = ref<Goal[]>([])
const investing = ref<Investing | null>(null)
const bufferSavedInput = ref('')
const bufferContributionInput = ref('')

const showCreateForm = ref(false)
const newName = ref('')
const newTarget = ref('')
const newTargetDate = ref('')
const newMonthlyDeposit = ref('')

async function load() {
  const [b, wf, g, inv] = await Promise.all([getBuffer(), loadWaterfall(), listGoals(), getInvesting()])
  buffer.value = b
  waterfall.value = wf
  goals.value = g
  investing.value = inv
  bufferSavedInput.value = (b.savedCents / 100).toString()
  bufferContributionInput.value = (b.monthlyContributionCents / 100).toString()
}

const netWorthCents = computed(
  () => (buffer.value?.savedCents ?? 0) + (investing.value?.currentValueCents ?? 0) + goals.value.reduce((sum, g) => sum + g.savedCents, 0),
)

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
    <div class="hero-panel">
      <div class="hero-figures">
        <div class="hero-label">samen opgebouwd</div>
        <div class="hero-figure">{{ formatEuros(netWorthCents) }}</div>
      </div>
      <div class="hero-sub">
        buffer, doelen en beleggingen samen
        <template v-if="buffer && buffer.monthlyContributionCents > 0">
          · {{ formatEuros(buffer.monthlyContributionCents) }} per maand opzij
        </template>
      </div>
    </div>

    <div class="grid">
      <div class="step-card">
        <div class="step-badge">
          <span class="badge-number">1</span>
          <span class="badge-label">Eerst: zekerheid</span>
        </div>
        <div class="step-row">
          <span class="step-name">Buffer</span>
          <span class="step-value">{{ formatEuros(buffer?.savedCents ?? 0) }} / {{ formatEuros((waterfall?.lastenMnd ?? 0) * bufferGoalMonths) }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill progress-fill--buffer" :style="{ width: `${bufferProgressPct}%` }" />
        </div>
        <p class="step-sub">
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

      <NuxtLink v-for="goal in goals" :key="goal.id" :to="`/vooruit/doel/${goal.id}`" class="step-card">
        <div class="step-badge">
          <span class="badge-number">2</span>
          <span class="badge-label">Doel met een datum</span>
        </div>
        <div class="step-row">
          <span class="step-name">{{ goal.name }}</span>
          <span class="step-value">{{ formatEuros(goal.savedCents) }} / {{ formatEuros(goal.targetCents) }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill progress-fill--goal" :style="{ width: `${goalProgressPct(goal)}%` }" />
        </div>
      </NuxtLink>

      <div class="step-card step-card--plain">
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

      <NuxtLink to="/vooruit/beleggen" class="step-card">
        <div class="step-badge">
          <span class="badge-number">3</span>
          <span class="badge-label">Richting zonder einddatum</span>
        </div>
        <div class="step-row">
          <span class="step-name">Beleggen</span>
          <span class="step-value step-value--heading">{{ formatEuros(investing?.depositsSinceCents ?? 0) }}</span>
        </div>
        <p class="step-sub">
          <template v-if="investing && investing.monthlyDepositCents > 0">
            {{ formatEuros(investing.monthlyDepositCents) }} per maand ·
          </template>
          geen einddatum
        </p>
      </NuxtLink>
    </div>

    <p class="footnote">De buffer gaat voor. Doelen schuiven op in een krappe maand; beleggen blijft staan.</p>
  </div>
</template>

<style scoped>
.vooruit-screen {
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1180px;
}

.hero-panel {
  background: var(--soft);
  border-radius: 32px;
  padding: 30px 34px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  flex-wrap: wrap;
}

.hero-figures {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-label {
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.hero-figure {
  font-family: var(--font-heading);
  font-size: 50px;
  line-height: 1;
  color: var(--ink-deep);
}

.hero-sub {
  font-size: 13px;
  color: var(--color-neutral-700);
  max-width: 260px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
  align-items: start;
}

.step-card {
  border-radius: 28px;
  background: var(--card);
  box-shadow: var(--shadow-sm);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  text-decoration: none;
  color: inherit;
}

a.step-card:hover {
  box-shadow: var(--shadow-md);
}

.step-card--plain {
  justify-content: center;
}

.step-badge {
  display: flex;
  align-items: center;
  gap: 9px;
}

.badge-number {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-label {
  font-size: 13px;
  color: var(--color-neutral-700);
}

.step-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.step-name {
  font-size: 16px;
}

.step-value {
  font-size: 13.5px;
  color: var(--color-neutral-800);
}

.step-value--heading {
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-text);
}

.progress-track {
  height: 10px;
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

.step-sub {
  font-size: 12px;
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

.create-section {
  display: flex;
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
  width: 100%;
}

.create-actions {
  display: flex;
  gap: 10px;
}

.footnote {
  font-size: 13px;
  color: var(--color-neutral-700);
  border-left: 2px solid var(--color-accent);
  padding-left: 13px;
  margin: 0;
  max-width: 640px;
}
</style>
