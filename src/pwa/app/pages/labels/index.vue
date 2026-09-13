<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { computeLabelStats } from '../../lib/domain/labels'
import { createLabel, listLabels, removeLabel } from '../../lib/db/labels'
import { getDb } from '../../lib/db/client'
import { useSidebarValues } from '../../composables/useSidebarValues'
import type { Label, Transaction } from '../../lib/domain/types'

useScreenHeader().set('Labels', 'wat kost het ons?', {
  back: { to: '/nu', label: 'Nu' },
})

const { refresh: refreshSidebarValues } = useSidebarValues()

const labels = ref<Label[]>([])
const transactions = ref<Transaction[]>([])
const showCreateForm = ref(false)
const newName = ref('')

async function load() {
  const db = await getDb()
  const [allLabels, allTransactions] = await Promise.all([listLabels(), db.getAll('transactions')])
  labels.value = allLabels
  transactions.value = allTransactions
}

onMounted(load)

function monthlyAverage(labelId: string): number {
  return computeLabelStats(labelId, transactions.value).monthlyAverageCents
}

function labelSub(labelId: string): string {
  const txCount = transactions.value.filter((t) => t.labelIds.includes(labelId)).length
  const envelopeCount = computeLabelStats(labelId, transactions.value).byEnvelope.length
  const txWord = `${txCount} ${txCount === 1 ? 'transactie' : 'transacties'}`
  return envelopeCount > 1 ? `${txWord} · ${envelopeCount} potjes` : txWord
}

async function submitCreate() {
  if (!newName.value.trim()) return
  await createLabel(newName.value.trim())
  newName.value = ''
  showCreateForm.value = false
  await load()
  await refreshSidebarValues()
}

async function deleteLabel(id: string) {
  await removeLabel(id)
  await refreshSidebarValues()
  await load()
}
</script>

<template>
  <div class="labels-screen">
    <p class="intro">Een label loopt dwars door potjes heen — zo zie je wat iets écht kost.</p>

    <div v-if="labels.length === 0" class="empty-note">Nog geen labels aangemaakt.</div>

    <div class="grid">
      <NuxtLink v-for="label in labels" :key="label.id" :to="`/labels/${label.id}`" class="label-card">
        <span class="label-name">
          ◈ {{ label.name }}
          <br />
          <span class="label-sub">{{ labelSub(label.id) }}</span>
        </span>
        <span class="label-amount">{{ formatEuros(monthlyAverage(label.id)) }}</span>
        <button type="button" class="dismiss-button" @click.prevent="deleteLabel(label.id)">✕</button>
      </NuxtLink>
    </div>

    <div class="create-section">
      <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
        + Nieuw label
      </button>
      <form v-else class="create-form" @submit.prevent="submitCreate">
        <input v-model="newName" type="text" placeholder="Naam, bijv. Auto 2" class="input" required />
        <div class="create-actions">
          <button type="submit" class="primary-button">Toevoegen</button>
          <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.labels-screen {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1000px;
}

.intro {
  margin: 0;
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.empty-note {
  font-size: 13px;
  color: var(--color-neutral-600);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.label-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border-radius: 24px;
  box-shadow: var(--shadow-sm);
  padding: 20px;
  text-decoration: none;
  color: inherit;
}

.label-card:hover {
  box-shadow: var(--shadow-md);
}

.label-name {
  flex: 1;
  font-size: 15px;
}

.label-sub {
  font-size: 12px;
  color: var(--color-neutral-700);
}

.label-amount {
  font-size: 15px;
  color: var(--color-text);
}

.dismiss-button {
  border: none;
  background: transparent;
  color: var(--color-neutral-500);
  cursor: pointer;
  font-size: 13px;
}

.create-section {
  display: flex;
}

.ghost-button {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-family: var(--font-heading);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 4px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  max-width: 320px;
}

.input {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 14px;
}

.create-actions {
  display: flex;
  gap: 10px;
}

.primary-button {
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
