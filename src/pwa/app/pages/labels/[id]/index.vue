<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatEuros } from '../../../lib/domain/format'
import { computeLabelStats, type LabelStats } from '../../../lib/domain/labels'
import { getLabel } from '../../../lib/db/labels'
import { listEnvelopes } from '../../../lib/db/envelopes'
import { getDb } from '../../../lib/db/client'
import type { Envelope, Label } from '../../../lib/domain/types'

const route = useRoute()

useScreenHeader().set('Label', 'Gemiddelde per maand en de kosten per potje.')

const label = ref<Label | null>(null)
const stats = ref<LabelStats | null>(null)
const envelopes = ref<Envelope[]>([])

async function load() {
  const id = String(route.params.id)
  const [found, db, allEnvelopes] = await Promise.all([getLabel(id), getDb(), listEnvelopes()])
  if (!found) {
    label.value = null
    return
  }
  label.value = found
  envelopes.value = allEnvelopes
  const transactions = await db.getAll('transactions')
  stats.value = computeLabelStats(id, transactions)
}

onMounted(load)
watch(() => route.params.id, load)

function envelopeName(id: string | null): string {
  return id ? (envelopes.value.find((e) => e.id === id)?.name ?? 'Onbekend potje') : 'Geen potje'
}

const maxEnvelopeAmount = computed(() =>
  stats.value ? Math.max(1, ...stats.value.byEnvelope.map((e) => e.amountCents)) : 1,
)
</script>

<template>
  <div v-if="!label" class="not-found">Dit label bestaat niet (meer).</div>

  <div v-else class="label-screen">
    <div class="left-panel">
      <div class="average-label">gemiddeld per maand</div>
      <div class="average-figure">{{ stats ? formatEuros(stats.monthlyAverageCents) : '—' }}</div>
      <div class="yearly-line">{{ stats ? formatEuros(stats.yearlyCents) : '—' }} per jaar</div>

      <NuxtLink :to="`/labels/${label.id}/scenario`" class="cta-button">Wegdenken: wat blijft er over? ›</NuxtLink>
    </div>

    <div class="right-panel">
      <div v-if="!stats || stats.byEnvelope.length === 0" class="empty-note">
        Nog geen transacties met dit label.
      </div>
      <div v-for="entry in stats?.byEnvelope" :key="entry.envelopeId ?? 'none'" class="bar-row">
        <span class="bar-label">{{ envelopeName(entry.envelopeId) }}</span>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: `${(entry.amountCents / maxEnvelopeAmount) * 100}%` }" />
        </div>
        <span class="bar-amount">{{ formatEuros(entry.amountCents) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--color-neutral-700);
}

.label-screen {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 24px;
  max-width: 900px;
  align-items: start;
}

.left-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.average-label {
  font-size: 13.5px;
  color: var(--ink-deep);
}

.average-figure {
  font-family: var(--font-heading);
  font-size: 46px;
  color: var(--ink-deep);
}

.yearly-line {
  font-size: 13px;
  color: var(--color-neutral-700);
}

.cta-button {
  margin-top: 12px;
  align-self: flex-start;
  border: none;
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 13.5px;
  border-radius: 999px;
  padding: 12px 18px;
  text-decoration: none;
}

.cta-button:hover {
  background: var(--color-accent-600);
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-note {
  font-size: 13px;
  color: var(--color-neutral-600);
}

.bar-row {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: center;
  gap: 12px;
}

.bar-label {
  font-size: 13px;
  color: var(--color-neutral-700);
}

.bar-track {
  height: 10px;
  border-radius: 999px;
  background: var(--color-neutral-200);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--color-accent);
}

.bar-amount {
  font-size: 13px;
  text-align: right;
  white-space: nowrap;
}
</style>
