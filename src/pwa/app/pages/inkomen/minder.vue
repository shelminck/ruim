<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { currentMonthKey } from '../../lib/domain/budget'
import { loadWaterfall } from '../../composables/useWaterfall'
import { getInvesting } from '../../lib/db/investing'
import { getMonthlyAdjustment, saveMonthlyAdjustment } from '../../lib/db/monthly-adjustments'
import { useSidebarValues } from '../../composables/useSidebarValues'
import type { WaterfallResult } from '../../lib/domain/waterfall'

// Design title is 'Je basis daalt' with a fixture-specific narrative subtitle
// ("Sam gaat 4 dagen werken · vanaf oktober") that doesn't generalize — this
// screen has no real "reason for the drop" data, so the subtitle stays generic.
useScreenHeader().set('Je basis daalt', 'reken door wat een lager inkomen betekent voor je plan', {
  back: { to: '/inkomen', label: 'Inkomen' },
})

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
      <p class="right-intro">Kies hoe je het opvangt — je ziet direct wat het kost.</p>

      <div class="coverage-option" :class="{ 'coverage-option--active': potjesKrimpCents > 0 }">
        <div class="coverage-header">
          <span>Potjes krimpen</span>
          <input v-model="potjesKrimpInput" type="text" inputmode="decimal" class="coverage-input" />
        </div>
        <p class="coverage-consequence">verlaagt de budgetten van je potjes deze maand</p>
      </div>

      <label class="coverage-option coverage-option--toggle" :class="{ 'coverage-option--active': investingPaused }">
        <div class="coverage-header">
          <span>Beleggen pauzeren</span>
          <span class="coverage-amount">{{ formatEuros(investingMonthlyCents) }}<input v-model="investingPaused" type="checkbox" /></span>
        </div>
        <p class="coverage-consequence">buffer en doelen lopen door, beleggen staat stil</p>
      </label>

      <div class="coverage-option" :class="{ 'coverage-option--active': bufferOpnameCents > 0 }">
        <div class="coverage-header">
          <span>Uit de buffer</span>
          <input v-model="bufferOpnameInput" type="text" inputmode="decimal" class="coverage-input" />
        </div>
        <p class="coverage-consequence">gaat ten koste van je buffer deze maand</p>
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

@media (max-width: 1100px) {
  .minder-screen {
    grid-template-columns: 1fr;
  }
}

.left-panel {
  background: var(--soft);
  border-radius: 30px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scenario-label {
  font-size: 13.5px;
  color: var(--color-neutral-700);
  margin: 0;
}

.drop-field {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-heading);
  font-size: 46px;
  line-height: 1;
  color: var(--color-accent-700);
}

.drop-input {
  border: none;
  background: transparent;
  font-family: var(--font-heading);
  font-size: 46px;
  line-height: 1;
  color: var(--color-accent-700);
  width: 140px;
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
  gap: 14px;
}

.right-intro {
  font-size: 13px;
  color: var(--color-neutral-700);
  margin: 0;
}

.coverage-option {
  background: #fff;
  border-radius: 22px;
  box-shadow: inset 0 0 0 1.5px var(--color-neutral-300);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coverage-option--active {
  box-shadow: inset 0 0 0 1.5px var(--color-accent);
  background: var(--color-accent-100);
}

.coverage-option--toggle {
  cursor: pointer;
}

.coverage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 14.5px;
}

.coverage-amount {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coverage-input {
  width: 90px;
  text-align: right;
  border: 1px solid var(--color-neutral-300);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
}

.coverage-consequence {
  margin: 0;
  font-size: 12px;
  color: var(--color-neutral-700);
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
