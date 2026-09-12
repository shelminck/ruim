<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDb } from '../lib/db/client'
import { listEnvelopes } from '../lib/db/envelopes'
import { formatEuros } from '../lib/domain/format'
import type { Envelope, Transaction } from '../lib/domain/types'

useScreenHeader().set('Alles', 'Alle transacties, met filters op potje en bedrag.')

type Filter = 'alles' | 'geen-potje' | 'groot'

const transactions = ref<Transaction[]>([])
const envelopes = ref<Envelope[]>([])
const filter = ref<Filter>('alles')

onMounted(async () => {
  const db = await getDb()
  const [allTransactions, allEnvelopes] = await Promise.all([db.getAll('transactions'), listEnvelopes()])
  transactions.value = [...allTransactions].sort((a, b) => (a.bookedAt < b.bookedAt ? 1 : -1))
  envelopes.value = allEnvelopes
})

function envelopeName(id: string | null): string | null {
  return id ? envelopes.value.find((e) => e.id === id)?.name ?? null : null
}

const filtered = computed(() => {
  switch (filter.value) {
    case 'geen-potje':
      return transactions.value.filter((t) => t.envelopeId === null)
    case 'groot':
      return transactions.value.filter((t) => Math.abs(t.amountCents) > 5000)
    default:
      return transactions.value
  }
})

const filters: { value: Filter; label: string }[] = [
  { value: 'alles', label: 'Alles' },
  { value: 'geen-potje', label: 'Geen potje' },
  { value: 'groot', label: 'Groot' },
]
</script>

<template>
  <div class="alles-screen">
    <div class="chip-row">
      <button
        v-for="item in filters"
        :key="item.value"
        type="button"
        class="filter-chip"
        :class="{ 'filter-chip--active': filter === item.value }"
        @click="filter = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="filtered.length === 0" class="empty-note">Geen transacties in dit filter.</div>

    <ul v-else class="tx-list">
      <li v-for="tx in filtered" :key="tx.id" class="tx-row">
        <div>
          <div class="tx-merchant">{{ tx.counterparty }}</div>
          <div class="tx-meta">
            {{ tx.bookedAt }}<template v-if="envelopeName(tx.envelopeId)"> · {{ envelopeName(tx.envelopeId) }}</template>
          </div>
        </div>
        <div class="tx-amount" :class="{ income: tx.amountCents > 0 }">
          {{ tx.amountCents > 0 ? '+ ' : '' }}{{ formatEuros(tx.amountCents) }}
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.alles-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
}

.chip-row {
  display: flex;
  gap: 8px;
}

.filter-chip {
  border: 1.5px solid var(--color-neutral-400);
  background: #fff;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
}

.filter-chip--active {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
  color: var(--color-accent-800);
}

.empty-note {
  font-size: 13px;
  color: var(--color-neutral-600);
}

.tx-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-neutral-200);
}

.tx-row:last-child {
  border-bottom: none;
}

.tx-merchant {
  font-size: 15px;
}

.tx-meta {
  font-size: 12px;
  color: var(--color-neutral-600);
  margin-top: 2px;
}

.tx-amount {
  font-size: 14px;
}

.tx-amount.income {
  color: var(--ink);
}
</style>
