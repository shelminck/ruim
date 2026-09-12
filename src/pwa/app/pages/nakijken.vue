<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDb } from '../lib/db/client'
import { listEnvelopes } from '../lib/db/envelopes'
import { listLabels } from '../lib/db/labels'
import { confirmTransaction, confirmWithBulkApply, undoRetroactiveApply } from '../lib/db/review'
import { findRetroactiveCandidates, guessEnvelopeForTransaction } from '../lib/domain/guess'
import { formatEuros } from '../lib/domain/format'
import type { Envelope, Label, Transaction } from '../lib/domain/types'
import { useNakijkenCount } from '../composables/useNakijkenCount'

useScreenHeader().set('Nakijken', 'Geef elke transactie een potje en leg er een regel onder.')

const { refresh: refreshNakijkenCount } = useNakijkenCount()

const queue = ref<Transaction[]>([])
const totalAtStart = ref(0)
const categorized = ref<Transaction[]>([])
const envelopes = ref<Envelope[]>([])
const labels = ref<Label[]>([])

const selectedEnvelopeId = ref<string | null>(null)
const selectedLabelIds = ref<string[]>([])
const ruleOn = ref(false)

const bulkAppliedTotal = ref(0)
const lastRuleId = ref<string | null>(null)

async function loadAll() {
  const db = await getDb()
  const [allTransactions, allEnvelopes, allLabels] = await Promise.all([
    db.getAll('transactions'),
    listEnvelopes(),
    listLabels(),
  ])
  queue.value = allTransactions.filter((t) => t.envelopeId === null)
  categorized.value = allTransactions.filter((t) => t.envelopeId !== null)
  envelopes.value = allEnvelopes
  labels.value = allLabels
  if (totalAtStart.value === 0) totalAtStart.value = queue.value.length
  resetSelection()
}

onMounted(loadAll)

const current = computed(() => queue.value[0] ?? null)

const guess = computed(() => (current.value ? guessEnvelopeForTransaction(current.value, categorized.value) : null))

const candidates = computed(() => (current.value ? findRetroactiveCandidates(current.value, queue.value) : []))

const envelopeChips = computed(() => {
  if (!guess.value) return envelopes.value.slice(0, 4)
  const guessed = envelopes.value.find((e) => e.id === guess.value!.envelopeId)
  const rest = envelopes.value.filter((e) => e.id !== guess.value!.envelopeId)
  return guessed ? [guessed, ...rest].slice(0, 4) : envelopes.value.slice(0, 4)
})

const consequenceText = computed(() => {
  if (!current.value || !selectedEnvelopeId.value) return ''
  const envelopeName = envelopes.value.find((e) => e.id === selectedEnvelopeId.value)?.name ?? ''
  const base = `"${current.value.counterparty}" → ${envelopeName}`
  return candidates.value.length > 0 ? `${base} · raakt ${candidates.value.length} oude transacties` : base
})

const filledSegments = computed(() => {
  if (totalAtStart.value === 0) return 12
  const done = totalAtStart.value - queue.value.length
  return Math.round((done / totalAtStart.value) * 12)
})

function resetSelection() {
  selectedEnvelopeId.value = guess.value?.envelopeId ?? null
  selectedLabelIds.value = []
  ruleOn.value = false
}

function toggleLabel(labelId: string) {
  selectedLabelIds.value = selectedLabelIds.value.includes(labelId)
    ? selectedLabelIds.value.filter((id) => id !== labelId)
    : [...selectedLabelIds.value, labelId]
}

function skip() {
  if (queue.value.length <= 1) return
  const [first, ...rest] = queue.value
  queue.value = [...rest, first!]
  resetSelection()
}

async function confirm() {
  if (!current.value || !selectedEnvelopeId.value) return
  await confirmTransaction({
    transactionId: current.value.id,
    envelopeId: selectedEnvelopeId.value,
    labelIds: selectedLabelIds.value,
    createRule: ruleOn.value,
  })
  await afterAssign([current.value.id])
}

async function confirmBulk() {
  if (!current.value || !selectedEnvelopeId.value) return
  const candidateIds = candidates.value.map((c) => c.id)
  const ruleId = await confirmWithBulkApply({
    transactionId: current.value.id,
    envelopeId: selectedEnvelopeId.value,
    labelIds: selectedLabelIds.value,
    createRule: true,
    candidateTransactionIds: candidateIds,
  })
  bulkAppliedTotal.value += candidateIds.length
  lastRuleId.value = ruleId
  await afterAssign([current.value.id, ...candidateIds])
}

async function afterAssign(touchedIds: string[]) {
  const touched = new Set(touchedIds)
  queue.value = queue.value.filter((t) => !touched.has(t.id))
  totalAtStart.value = Math.max(totalAtStart.value, 0)
  await refreshHistoryOnly()
  await refreshNakijkenCount()
  resetSelection()
}

async function refreshHistoryOnly() {
  const db = await getDb()
  categorized.value = (await db.getAll('transactions')).filter((t) => t.envelopeId !== null)
}

async function undoLastBulk() {
  if (!lastRuleId.value) return
  await undoRetroactiveApply(lastRuleId.value)
  lastRuleId.value = null
  bulkAppliedTotal.value = 0
  await loadAll()
  await refreshNakijkenCount()
}
</script>

<template>
  <div class="nakijken-screen">
    <div class="left-column">
      <div class="progress-bar">
        <span
          v-for="segment in 12"
          :key="segment"
          class="segment"
          :class="{ 'segment--filled': segment <= filledSegments }"
        />
      </div>

      <div v-if="current" class="item-card">
        <div class="item-top">
          <div>
            <div class="item-merchant">{{ current.counterparty }}</div>
            <div class="item-meta">{{ current.bookedAt }} · {{ current.description }}</div>
          </div>
          <div class="item-amount" :class="{ income: current.amountCents > 0 }">
            {{ formatEuros(current.amountCents) }}
          </div>
        </div>

        <div v-if="guess" class="confidence-line">
          <span class="confidence-dot" />
          Ruim gokt op {{ envelopes.find((e) => e.id === guess!.envelopeId)?.name }} · {{ guess.confidencePercent }}% zeker
        </div>

        <div class="chip-row">
          <button
            v-for="envelope in envelopeChips"
            :key="envelope.id"
            type="button"
            class="chip chip--envelope"
            :class="{ 'chip--selected': selectedEnvelopeId === envelope.id }"
            @click="selectedEnvelopeId = envelope.id"
          >
            {{ envelope.name }}
          </button>
        </div>

        <div v-if="labels.length > 0" class="chip-row">
          <button
            v-for="label in labels"
            :key="label.id"
            type="button"
            class="chip chip--label"
            :class="{ 'chip--selected': selectedLabelIds.includes(label.id) }"
            @click="toggleLabel(label.id)"
          >
            ◈ {{ label.name }}
          </button>
        </div>

        <label class="rule-callout" :class="{ 'rule-callout--on': ruleOn }">
          <input v-model="ruleOn" type="checkbox" />
          <span>
            <strong>Voortaan zo, ook terugwerkend</strong>
            <small v-if="consequenceText">{{ consequenceText }}</small>
          </span>
        </label>

        <div class="actions-row">
          <button type="button" class="outline-button" @click="skip">Overslaan</button>
          <button type="button" class="primary-button" :disabled="!selectedEnvelopeId" @click="confirm">
            Bevestigen · volgende
          </button>
        </div>

        <div v-if="ruleOn && candidates.length > 0" class="bulk-callout">
          <div>⚡ Deze én {{ candidates.length }} vergelijkbare in één keer</div>
          <p>zelfde tegenrekening en omschrijving · je kunt het later terugdraaien</p>
          <button type="button" class="bulk-button" :disabled="!selectedEnvelopeId" @click="confirmBulk">
            Alle {{ candidates.length + 1 }} bevestigen
          </button>
        </div>
      </div>

      <div v-else class="empty-state">
        <p><strong>Klaar ✓</strong></p>
        <p>Alles heeft een potje. Niets meer te doen.</p>
      </div>
    </div>

    <div class="right-column">
      <div class="panel">
        <h2 class="panel-title">In de rij · {{ Math.max(0, queue.length - 1) }} over</h2>
        <ul class="queue-list">
          <li v-for="tx in queue.slice(1, 8)" :key="tx.id">{{ tx.counterparty }}</li>
        </ul>
      </div>

      <div v-if="bulkAppliedTotal > 0" class="confirmation-strip">
        <span>✓ {{ bulkAppliedTotal }} oude transacties meegenomen via je regels</span>
        <button type="button" class="text-button" @click="undoLastBulk">Ongedaan maken</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nakijken-screen {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 960px;
}

@media (max-width: 1100px) {
  .nakijken-screen {
    grid-template-columns: 1fr;
  }
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-bar {
  display: flex;
  gap: 4px;
}

.segment {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--color-neutral-200);
}

.segment--filled {
  background: var(--ink);
}

.item-card {
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.item-merchant {
  font-size: 18px;
  font-family: var(--font-heading);
}

.item-meta {
  font-size: 12.5px;
  color: var(--color-neutral-600);
  margin-top: 2px;
}

.item-amount {
  font-family: var(--font-heading);
  font-size: 34px;
  color: var(--color-text);
  white-space: nowrap;
}

.item-amount.income {
  color: var(--ink);
}

.confidence-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.confidence-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-accent);
  flex: none;
}

.chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  border: 1.5px solid var(--color-neutral-300);
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.chip--envelope.chip--selected {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
  color: var(--color-accent-800);
}

.chip--label.chip--selected {
  border-color: var(--ink);
  background: var(--soft);
  color: var(--ink-deep);
}

.rule-callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--radius-checkbox-callout);
  border: 1.5px solid var(--color-neutral-300);
  padding: 14px 16px;
  cursor: pointer;
  font-size: 13.5px;
}

.rule-callout--on {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
}

.rule-callout span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rule-callout small {
  color: var(--color-neutral-700);
  font-size: 12px;
}

.actions-row {
  display: flex;
  gap: 10px;
}

.outline-button {
  border: 1.5px solid var(--ink);
  background: transparent;
  color: var(--ink);
  border-radius: 999px;
  padding: 12px 18px;
  font-family: var(--font-heading);
  font-size: 14px;
  cursor: pointer;
}

.primary-button {
  flex: 1;
  border: none;
  background: var(--ink);
  color: #fff;
  border-radius: 999px;
  padding: 12px 18px;
  font-family: var(--font-heading);
  font-size: 14px;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button:hover:not(:disabled) {
  background: var(--ink-deep);
}

.bulk-callout {
  background: var(--color-accent-100);
  border-radius: var(--radius-callout);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--color-accent-800);
}

.bulk-callout p {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-accent-700);
}

.bulk-button {
  align-self: flex-start;
  margin-top: 6px;
  border: none;
  background: var(--color-accent);
  color: #fff;
  border-radius: 999px;
  padding: 10px 16px;
  font-family: var(--font-heading);
  font-size: 13.5px;
  cursor: pointer;
}

.bulk-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 26px;
  color: var(--ink-deep);
}

.panel {
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 20px;
}

.panel-title {
  font-size: 15px;
  margin-bottom: 10px;
}

.queue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.confirmation-strip {
  background: var(--soft);
  border-radius: var(--radius-row);
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--ink-deep);
}

.text-button {
  border: none;
  background: transparent;
  color: var(--color-accent-700);
  cursor: pointer;
  font-size: 12.5px;
}
</style>
