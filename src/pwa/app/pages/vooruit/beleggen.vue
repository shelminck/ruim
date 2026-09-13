<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { getInvesting, saveInvesting } from '../../lib/db/investing'
import type { Investing } from '../../lib/domain/types'

useScreenHeader().set('Beleggen', 'richting, geen potje dat leegraakt', {
  back: { to: '/vooruit', label: 'Vooruit' },
})

const investing = ref<Investing | null>(null)
const depositsInput = ref('')
const valueInput = ref('')
const monthlyInput = ref('')

async function load() {
  const found = await getInvesting()
  investing.value = found
  depositsInput.value = (found.depositsSinceCents / 100).toString()
  valueInput.value = (found.currentValueCents / 100).toString()
  monthlyInput.value = (found.monthlyDepositCents / 100).toString()
}

onMounted(load)

const gainCents = computed(() => (investing.value ? investing.value.currentValueCents - investing.value.depositsSinceCents : 0))

async function save() {
  const depositsSinceCents = Math.round(Number(depositsInput.value.replace(',', '.')) * 100)
  const currentValueCents = Math.round(Number(valueInput.value.replace(',', '.')) * 100)
  const monthlyDepositCents = Math.round(Number(monthlyInput.value.replace(',', '.')) * 100)
  if (![depositsSinceCents, currentValueCents, monthlyDepositCents].every(Number.isFinite)) return

  await saveInvesting({ id: 'investing', depositsSinceCents, currentValueCents, monthlyDepositCents })
  await load()
}
</script>

<template>
  <div v-if="investing" class="beleggen-screen">
    <div class="left-column">
      <div class="figure-card">
        <div class="figure-label">ingelegd sinds het begin</div>
        <div class="figure-value">{{ formatEuros(investing.depositsSinceCents) }}</div>
        <div class="figure-sub">
          waarde vandaag {{ formatEuros(investing.currentValueCents) }} ·
          <span :class="{ negative: gainCents < 0 }">{{ gainCents >= 0 ? '+' : '' }}{{ formatEuros(gainCents) }}</span>
        </div>
      </div>
    </div>

    <div class="right-column">
      <div class="philosophy-note">
        We volgen je inleg, niet de koers. Koerswinst is geen geld om mee te budgetteren — en telt niet mee in je buffer.
      </div>

      <form class="settings-card" @submit.prevent="save">
        <label class="field">
          <span>Inleg sinds het begin (€)</span>
          <input v-model="depositsInput" type="text" inputmode="decimal" class="input" />
        </label>
        <label class="field">
          <span>Waarde vandaag (€)</span>
          <input v-model="valueInput" type="text" inputmode="decimal" class="input" />
        </label>
        <label class="field">
          <span>Vaste inleg per maand (€)</span>
          <input v-model="monthlyInput" type="text" inputmode="decimal" class="input" />
        </label>
        <button type="submit" class="primary-button">Opslaan</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.beleggen-screen {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 1060px;
  align-items: start;
}

@media (max-width: 1100px) {
  .beleggen-screen {
    grid-template-columns: 1fr;
  }
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.figure-card {
  background: var(--card);
  box-shadow: var(--shadow-sm);
  border-radius: 30px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.figure-label {
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.figure-value {
  font-family: var(--font-heading);
  font-size: 40px;
  line-height: 1;
}

.figure-sub {
  font-size: 13px;
  color: var(--color-neutral-700);
}

.figure-sub .negative {
  color: var(--color-accent-700);
}

.figure-sub span:not(.negative) {
  color: var(--ink);
}

.philosophy-note {
  border-radius: 22px;
  border: 1.5px dashed var(--color-accent);
  background: var(--color-accent-100);
  padding: 18px;
  font-size: 13px;
  color: var(--color-accent-800);
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card);
  border-radius: 28px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--color-neutral-700);
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
</style>
