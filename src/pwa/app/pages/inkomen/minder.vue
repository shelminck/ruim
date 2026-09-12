<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { currentMonthKey } from '../../lib/domain/budget'
import { loadWaterfall } from '../../composables/useWaterfall'
import { getInvesting } from '../../lib/db/investing'
import { getMonthlyAdjustment, saveMonthlyAdjustment } from '../../lib/db/monthly-adjustments'
import { useSidebarValues } from '../../composables/useSidebarValues'
import type { WaterfallResult } from '../../lib/domain/waterfall'

useScreenHeader().set('Minder inkomen', 'Dek een inkomensdaling met potjes, pauzeren of de buffer.')

const router = useRouter()
const { refresh: refreshSidebarValues } = useSidebarValues()

const waterfall = ref<WaterfallResult | null>(null)
const investingMonthlyCents = ref(0)
const isActive = ref(false)

const dropInput = ref('')
const potjesKrimpInput = ref('0')
const investingPaused = ref(false)
const bufferOpnameInput = ref('0')

async function load() {
  const [wf, investing, adjustment] = await Promise.all([
    loadWaterfall(),
    getInvesting(),
    getMonthlyAdjustment(currentMonthKey()),
  ])
  waterfall.value = wf
  investingMonthlyCents.value = investing.monthlyDepositCents
  isActive.value = adjustment.incomeDropCents > 0

  dropInput.value = (adjustment.incomeDropCents / 100).toString()
  potjesKrimpInput.value = (adjustment.potjesKrimpCents / 100).toString()
  investingPaused.value = adjustment.investingPausedThisMonth
  bufferOpnameInput.value = (adjustment.bufferOpnameCents / 100).toString()
}

onMounted(load)

const dropCents = computed(() => Math.round(Number(dropInput.value.replace(',', '.')) * 100) || 0)
const potjesKrimpCents = computed(() => Math.round(Number(potjesKrimpInput.value.replace(',', '.')) * 100) || 0)
const bufferOpnameCents = computed(() => Math.round(Number(bufferOpnameInput.value.replace(',', '.')) * 100) || 0)

const coveredCents = computed(
  () => potjesKrimpCents.value + (investingPaused.value ? investingMonthlyCents.value : 0) + bufferOpnameCents.value,
)
const remainingGapCents = computed(() => Math.max(0, dropCents.value - coveredCents.value))
const canApply = computed(() => dropCents.value > 0 && remainingGapCents.value === 0)

const newBasis = computed(() => (waterfall.value ? waterfall.value.basis - dropCents.value : 0))
const nextMonthLabel = computed(() => {
  const next = new Date()
  next.setMonth(next.getMonth() + 1)
  return new Intl.DateTimeFormat('nl-NL', { month: 'long' }).format(next)
})

async function apply() {
  if (!canApply.value) return
  // Merge onto the existing adjustment — a Meevaller allocated earlier this
  // month has its own extraVrijCents on this same record, and must survive.
  const current = await getMonthlyAdjustment(currentMonthKey())
  await saveMonthlyAdjustment({
    ...current,
    incomeDropCents: dropCents.value,
    potjesKrimpCents: potjesKrimpCents.value,
    investingPausedThisMonth: investingPaused.value,
    bufferOpnameCents: bufferOpnameCents.value,
  })
  await refreshSidebarValues()
  await router.push('/inkomen/waterval')
}

async function deactivate() {
  const current = await getMonthlyAdjustment(currentMonthKey())
  await saveMonthlyAdjustment({
    ...current,
    incomeDropCents: 0,
    potjesKrimpCents: 0,
    investingPausedThisMonth: false,
    bufferOpnameCents: 0,
  })
  dropInput.value = '0'
  potjesKrimpInput.value = '0'
  investingPaused.value = false
  bufferOpnameInput.value = '0'
  isActive.value = false
  await load()
  await refreshSidebarValues()
}
</script>

<template>
  <div v-if="waterfall" class="minder-screen">
    <div class="left-panel">
      <p class="scenario-label">je plan is te duur geworden met</p>
      <label class="drop-field">
        <span>−</span>
        <input v-model="dropInput" type="text" inputmode="decimal" class="drop-input" placeholder="0" />
      </label>
      <p class="basis-line">basis {{ formatEuros(waterfall.basis) }} → {{ formatEuros(newBasis) }}</p>

      <button v-if="isActive" type="button" class="text-button" @click="deactivate">Scenario uitzetten</button>
    </div>

    <div class="right-panel">
      <div class="coverage-option">
        <div class="coverage-header">
          <span>Potjes krimpen</span>
          <input v-model="potjesKrimpInput" type="text" inputmode="decimal" class="coverage-input" />
        </div>
      </div>

      <label class="coverage-option coverage-option--toggle">
        <div class="coverage-header">
          <span>Beleggen pauzeren</span>
          <span>{{ formatEuros(investingMonthlyCents) }}</span>
        </div>
        <input v-model="investingPaused" type="checkbox" />
      </label>

      <div class="coverage-option">
        <div class="coverage-header">
          <span>Uit de buffer</span>
          <input v-model="bufferOpnameInput" type="text" inputmode="decimal" class="coverage-input" />
        </div>
      </div>

      <div class="gap-strip" :class="{ 'gap-strip--covered': remainingGapCents === 0 && dropCents > 0 }">
        Nog te dekken {{ formatEuros(remainingGapCents) }}
      </div>

      <button type="button" class="primary-button" :disabled="!canApply" @click="apply">
        Plan bijstellen vanaf {{ nextMonthLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.minder-screen {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 800px;
  align-items: start;
}

.left-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scenario-label {
  font-size: 13.5px;
  color: var(--ink-deep);
  margin: 0;
}

.drop-field {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-heading);
  font-size: 32px;
  color: var(--color-accent-700);
}

.drop-input {
  border: none;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 32px;
  color: var(--color-accent-700);
  width: 120px;
}

.drop-input:focus {
  outline: none;
}

.basis-line {
  font-size: 13px;
  color: var(--color-neutral-700);
  margin: 4px 0 0;
}

.text-button {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--ink-deep);
  text-decoration: underline;
  cursor: pointer;
  font-size: 12.5px;
  margin-top: 8px;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coverage-option {
  background: var(--card);
  border-radius: var(--radius-row);
  box-shadow: var(--shadow-sm);
  padding: 14px 16px;
}

.coverage-option--toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.coverage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.coverage-input {
  width: 90px;
  text-align: right;
  border: 1px solid var(--color-neutral-300);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
}

.gap-strip {
  background: var(--color-accent-100);
  color: var(--color-accent-800);
  border-radius: var(--radius-row);
  padding: 12px 16px;
  font-size: 13.5px;
  text-align: center;
}

.gap-strip--covered {
  background: var(--soft);
  color: var(--ink-deep);
}

.primary-button {
  border: none;
  background: var(--color-neutral-200);
  color: var(--color-neutral-700);
  font-family: var(--font-heading);
  font-size: 14px;
  border-radius: 999px;
  padding: 14px;
  cursor: not-allowed;
}

.primary-button:not(:disabled) {
  background: var(--ink);
  color: #fff;
  cursor: pointer;
}

.primary-button:not(:disabled):hover {
  background: var(--ink-deep);
}
</style>
