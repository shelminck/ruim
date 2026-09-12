<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { getInvesting, saveInvesting } from '../../lib/db/investing'
import type { Investing } from '../../lib/domain/types'

useScreenHeader().set('Beleggen', 'Inleg sinds het begin, los van koerswinst.', {
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
    <div class="figures">
      <div class="figure-block">
        <div class="figure-label">Inleg sinds het begin</div>
        <div class="figure-value">{{ formatEuros(investing.depositsSinceCents) }}</div>
      </div>
      <div class="figure-block">
        <div class="figure-label">Waarde vandaag</div>
        <div class="figure-value">{{ formatEuros(investing.currentValueCents) }}</div>
        <div class="figure-sub" :class="{ negative: gainCents < 0 }">
          {{ gainCents >= 0 ? '+' : '' }}{{ formatEuros(gainCents) }} koersresultaat
        </div>
      </div>
    </div>

    <div class="philosophy-note">
      We volgen je inleg, niet de koers. Koerswinst is geen geld om mee te budgetteren — en telt niet mee in je buffer.
    </div>

    <form class="edit-form" @submit.prevent="save">
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
</template>

<style scoped>
.beleggen-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 560px;
}

.figures {
  display: flex;
  gap: 24px;
}

.figure-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.figure-value {
  font-family: var(--font-heading);
  font-size: 40px;
  margin-top: 4px;
}

.figure-sub {
  font-size: 12.5px;
  color: var(--ink);
  margin-top: 4px;
}

.figure-sub.negative {
  color: var(--color-accent-700);
}

.philosophy-note {
  border: 1.5px dashed var(--color-accent);
  border-radius: var(--radius-callout);
  padding: 16px 18px;
  font-size: 13px;
  color: var(--color-accent-800);
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card);
  border-radius: var(--radius-card);
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
