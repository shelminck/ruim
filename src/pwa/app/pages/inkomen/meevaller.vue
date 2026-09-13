<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { currentMonthKey } from '../../lib/domain/budget'
import { loadWaterfall } from '../../composables/useWaterfall'
import { getBuffer, saveBuffer } from '../../lib/db/buffer'
import { getInvesting, saveInvesting } from '../../lib/db/investing'
import { getMonthlyAdjustment, saveMonthlyAdjustment } from '../../lib/db/monthly-adjustments'
import { getWindfallPolicy, saveWindfallPolicy } from '../../lib/db/windfall-policy'
import type { WaterfallResult } from '../../lib/domain/waterfall'

const screenHeader = useScreenHeader()
screenHeader.set('Er kwam meer binnen', '', { back: { to: '/inkomen', label: 'Inkomen' } })

const router = useRouter()

const waterfall = ref<WaterfallResult | null>(null)
const bufferSavedCents = ref(0)
const lastenMnd = ref(0)
const bufferPct = ref(30)
const investingPct = ref(20)
const makePermanent = ref(false)

async function load() {
  const [wf, buffer, policy] = await Promise.all([loadWaterfall(), getBuffer(), getWindfallPolicy()])
  waterfall.value = wf
  bufferSavedCents.value = buffer.savedCents
  lastenMnd.value = wf.lastenMnd
  if (policy) {
    bufferPct.value = policy.bufferPct
    investingPct.value = policy.investingPct
    makePermanent.value = true
  }
  screenHeader.set('Er kwam meer binnen', `${formatEuros(wf.meevaller)} boven je basis`, {
    back: { to: '/inkomen', label: 'Inkomen' },
  })
}

onMounted(load)

const meevaller = computed(() => waterfall.value?.meevaller ?? 0)

function onBufferPctInput(value: number) {
  bufferPct.value = value
  if (bufferPct.value + investingPct.value > 100) investingPct.value = 100 - bufferPct.value
}

function onInvestingPctInput(value: number) {
  investingPct.value = value
  if (bufferPct.value + investingPct.value > 100) bufferPct.value = 100 - investingPct.value
}

const extraBuffer = computed(() => Math.round((meevaller.value * bufferPct.value) / 100))
const extraBeleg = computed(() => Math.round((meevaller.value * investingPct.value) / 100))
const extraVrij = computed(() => meevaller.value - extraBuffer.value - extraBeleg.value)

const bufferMonthsNow = computed(() => (lastenMnd.value > 0 ? bufferSavedCents.value / lastenMnd.value : 0))
const bufferMonthsAfter = computed(() =>
  lastenMnd.value > 0 ? (bufferSavedCents.value + extraBuffer.value) / lastenMnd.value : 0,
)

async function apply() {
  const [buffer, investing, adjustment] = await Promise.all([
    getBuffer(),
    getInvesting(),
    getMonthlyAdjustment(currentMonthKey()),
  ])

  await saveBuffer({ ...buffer, savedCents: buffer.savedCents + extraBuffer.value })
  await saveInvesting({
    ...investing,
    depositsSinceCents: investing.depositsSinceCents + extraBeleg.value,
    currentValueCents: investing.currentValueCents + extraBeleg.value,
  })
  await saveMonthlyAdjustment({
    ...adjustment,
    extraVrijCents: adjustment.extraVrijCents + extraVrij.value,
    extraBufferCents: adjustment.extraBufferCents + extraBuffer.value,
    extraBelegCents: adjustment.extraBelegCents + extraBeleg.value,
  })

  if (makePermanent.value) {
    await saveWindfallPolicy({ id: 'windfallPolicy', bufferPct: bufferPct.value, investingPct: investingPct.value })
  }

  await router.push('/vooruit')
}
</script>

<template>
  <div v-if="waterfall" class="meevaller-screen">
    <div v-if="meevaller <= 0" class="empty-note">Er is deze maand geen meevaller om te verdelen.</div>

    <template v-else>
      <div class="hero-panel">
        <div class="hero-label">meevaller om te verdelen</div>
        <div class="hero-figure">{{ formatEuros(meevaller) }}</div>
      </div>

      <label class="slider-field">
        <div class="slider-label">
          <span>Buffer aanvullen</span>
          <span>{{ bufferPct }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          :value="bufferPct"
          @input="onBufferPctInput(Number(($event.target as HTMLInputElement).value))"
        />
        <p class="slider-consequence">
          buffer {{ bufferMonthsNow.toFixed(1).replace('.', ',') }} → {{ bufferMonthsAfter.toFixed(1).replace('.', ',') }}
          maanden lasten
        </p>
      </label>

      <label class="slider-field">
        <div class="slider-label">
          <span>Extra beleggen</span>
          <span>{{ investingPct }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          :value="investingPct"
          @input="onInvestingPctInput(Number(($event.target as HTMLInputElement).value))"
        />
        <p class="slider-consequence">{{ formatEuros(extraBeleg) }} erbij op je inleg</p>
      </label>

      <div class="remainder-panel">
        <span>Erbij op je vrij te besteden</span>
        <strong>{{ formatEuros(extraVrij) }}</strong>
        <p>eenmalig, alleen deze maand</p>
      </div>

      <label class="checkbox-row">
        <input v-model="makePermanent" type="checkbox" />
        <span>Elke meevaller zo verdelen — dan hoef je dit nooit meer te beslissen</span>
      </label>

      <button type="button" class="primary-button" @click="apply">
        {{ makePermanent ? 'Zo doen · en voortaan automatisch' : 'Zo doen' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.meevaller-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}

.empty-note {
  font-size: 14px;
  color: var(--color-neutral-700);
}

.hero-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 26px;
}

.hero-label {
  font-size: 13.5px;
  color: var(--ink-deep);
}

.hero-figure {
  font-family: var(--font-heading);
  font-size: 40px;
  color: var(--ink-deep);
  margin-top: 4px;
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 18px;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.slider-field input[type='range'] {
  accent-color: var(--color-accent);
  height: 22px;
}

.slider-consequence {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-neutral-700);
}

.remainder-panel {
  background: var(--soft);
  border-radius: var(--radius-callout);
  padding: 18px;
}

.remainder-panel strong {
  display: block;
  font-family: var(--font-heading);
  font-size: 28px;
  color: var(--ink-deep);
  margin-top: 4px;
}

.remainder-panel p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-neutral-700);
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.primary-button {
  border: none;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 14px;
  border-radius: 999px;
  padding: 14px;
  cursor: pointer;
}

.primary-button:hover {
  background: var(--ink-deep);
}
</style>
