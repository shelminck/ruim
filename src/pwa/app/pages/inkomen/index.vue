<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import type { IncomeSource } from '../../lib/domain/types'
import { createIncomeSource, listIncomeSources, updateIncomeSource } from '../../lib/db/income-sources'
import { useSidebarValues } from '../../composables/useSidebarValues'

const screenHeader = useScreenHeader()
screenHeader.set('Inkomen', '0 bronnen · deze maand € 0 binnen', { back: { to: '/nu', label: 'Nu' } })

const { refresh: refreshSidebarValues } = useSidebarValues()

const sources = ref<IncomeSource[]>([])
const showCreateForm = ref(false)
const newName = ref('')
const newAmount = ref('')
const newCountsTowardBase = ref(true)

async function load() {
  sources.value = await listIncomeSources()
  const totalIn = sources.value.reduce((sum, s) => sum + s.amountCents, 0)
  screenHeader.set('Inkomen', `${sources.value.length} bronnen · deze maand ${formatEuros(totalIn)} binnen`, {
    back: { to: '/nu', label: 'Nu' },
  })
}

onMounted(load)

const binnen = computed(() => sources.value.reduce((sum, s) => sum + s.amountCents, 0))
const basis = computed(() =>
  sources.value.filter((s) => s.countsTowardBase).reduce((sum, s) => sum + s.amountCents, 0),
)
const meevaller = computed(() => Math.max(0, binnen.value - basis.value))

const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const currentMonthIndex = new Date().getMonth()
const chartMax = computed(() => Math.max(basis.value, 1))
const baseLinePct = computed(() => Math.min(100, (basis.value / chartMax.value) * 100))

async function toggleSource(source: IncomeSource) {
  await updateIncomeSource({ ...source, countsTowardBase: !source.countsTowardBase })
  await load()
  await refreshSidebarValues()
}

async function submitCreate() {
  const amountCents = Math.round(Number(newAmount.value.replace(',', '.')) * 100)
  if (!newName.value.trim() || !Number.isFinite(amountCents) || amountCents <= 0) return
  await createIncomeSource({ name: newName.value.trim(), amountCents, countsTowardBase: newCountsTowardBase.value })
  newName.value = ''
  newAmount.value = ''
  newCountsTowardBase.value = true
  showCreateForm.value = false
  await load()
  await refreshSidebarValues()
}
</script>

<template>
  <div class="inkomen-screen">
    <div class="left-column">
      <div class="hero-panel">
        <div class="hero-label">je plan draait op</div>
        <div class="hero-figure">{{ formatEuros(basis) }}</div>
        <div class="hero-sub">per maand · alles daarboven is meevaller</div>
      </div>

      <div class="chart-card">
        <div class="chart" :style="{ '--base-line': `${baseLinePct}%` }">
          <div v-for="(month, index) in months" :key="month" class="chart-column">
            <div
              v-if="index === currentMonthIndex"
              class="chart-bar chart-bar--current"
              :style="{ height: `${Math.min(100, (basis / chartMax) * 100)}%` }"
            />
            <div v-else class="chart-bar" />
            <span class="chart-label">{{ month }}</span>
          </div>
        </div>
        <p class="chart-note">Historie per maand verschijnt zodra er meerdere maanden data zijn.</p>
      </div>

      <div class="source-list">
        <button
          v-for="source in sources"
          :key="source.id"
          type="button"
          class="source-card"
          :class="{ 'source-card--excluded': !source.countsTowardBase }"
          @click="toggleSource(source)"
        >
          <span>{{ source.name }}</span>
          <span class="source-amount">{{ formatEuros(source.amountCents) }}</span>
          <span v-if="!source.countsTowardBase" class="source-flag">niet in basis</span>
        </button>
      </div>

      <div class="create-section">
        <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
          + Inkomstenbron toevoegen
        </button>
        <form v-else class="create-form" @submit.prevent="submitCreate">
          <input v-model="newName" type="text" placeholder="Naam, bijv. Salaris" class="input" required />
          <input v-model="newAmount" type="text" inputmode="decimal" placeholder="Bedrag per maand" class="input" required />
          <label class="checkbox-row">
            <input v-model="newCountsTowardBase" type="checkbox" />
            <span>Telt mee in basisinkomen (anders: meevaller)</span>
          </label>
          <div class="create-actions">
            <button type="submit" class="primary-button">Toevoegen</button>
            <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
          </div>
        </form>
      </div>
    </div>

    <div class="right-column">
      <p class="explanation">
        Bronnen die meetellen vormen je basis — daar draait je hele plan op. Variabele bronnen (zoals freelance-inkomsten)
        kun je uitsluiten: alles wat binnenkomt boven je basis is een meevaller om bewust te verdelen.
      </p>
      <NuxtLink to="/inkomen/waterval" class="link-card">Bekijk de waterval ›</NuxtLink>

      <NuxtLink v-if="meevaller > 0" to="/inkomen/meevaller" class="windfall-card">
        {{ formatEuros(meevaller) }} meevaller · nog niet verdeeld ›
      </NuxtLink>

      <NuxtLink to="/inkomen/minder" class="link-card">Wat als je inkomen daalt? ›</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.inkomen-screen {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 960px;
}

@media (max-width: 1100px) {
  .inkomen-screen {
    grid-template-columns: 1fr;
  }
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 30px;
}

.hero-label {
  font-size: 13.5px;
  color: var(--ink-deep);
}

.hero-figure {
  font-family: var(--font-heading);
  font-size: 50px;
  color: var(--ink-deep);
  margin-top: 4px;
}

.hero-sub {
  font-size: 12.5px;
  color: var(--color-neutral-700);
  margin-top: 4px;
}

.chart-card {
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 20px;
}

.chart {
  height: 140px;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  position: relative;
  border-top: 1px dashed transparent;
}

.chart::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--base-line);
  border-top: 1.5px dashed var(--ink);
}

.chart-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 6px;
}

.chart-bar {
  width: 100%;
  border-radius: 999px 999px 5px 5px;
  background: var(--color-neutral-300);
  min-height: 2px;
}

.chart-bar--current {
  background: var(--color-accent);
}

.chart-label {
  font-size: 10px;
  color: var(--color-neutral-600);
}

.chart-note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-neutral-600);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: none;
  border-radius: var(--radius-row);
  box-shadow: var(--shadow-sm);
  padding: 14px 18px;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.source-card--excluded {
  border: 1.5px solid var(--color-accent);
  background: var(--color-accent-100);
}

.source-amount {
  margin-left: auto;
  font-family: var(--font-heading);
}

.source-flag {
  font-size: 11px;
  color: var(--color-accent-700);
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
  max-width: 360px;
}

.input {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 14px;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--color-neutral-700);
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

.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.explanation {
  font-size: 13.5px;
  color: var(--color-neutral-700);
  margin: 0;
}

.link-card {
  display: block;
  background: var(--card);
  border-radius: var(--radius-row);
  box-shadow: var(--shadow-sm);
  padding: 14px 18px;
  font-size: 14px;
  color: var(--ink-deep);
  text-decoration: none;
}

.windfall-card {
  display: block;
  background: var(--soft);
  border: 1.5px solid var(--ink);
  border-radius: var(--radius-row);
  padding: 14px 18px;
  font-size: 14px;
  color: var(--ink-deep);
  text-decoration: none;
}

.windfall-card:hover {
  background: #c9d2e2;
}
</style>
