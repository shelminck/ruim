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
        <div class="chart-overline">Wat er binnenkwam · 12 maanden</div>
        <div class="chart" :style="{ '--base-line': `${baseLinePct}%` }">
          <div v-for="(month, index) in months" :key="month" class="chart-column">
            <div
              v-if="index === currentMonthIndex"
              class="chart-bar chart-bar--current"
              :style="{ height: `${Math.min(100, (basis / chartMax) * 100)}%` }"
            />
            <div v-else class="chart-bar" />
          </div>
        </div>
        <div class="chart-footer">
          <span>okt '25</span>
          <span class="chart-legend"><span class="chart-legend-line" />basis</span>
          <span>sep '26</span>
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
          <span class="source-name">{{ source.name }}</span>
          <span class="source-amount">
            {{ formatEuros(source.amountCents) }}
            <br />
            <span class="source-flag" :class="{ 'source-flag--excluded': !source.countsTowardBase }">
              {{ source.countsTowardBase ? 'telt mee in basis' : 'niet in basis' }}
            </span>
          </span>
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
      <p class="explanation">Tik een bron aan om hem wel of niet in je basis te laten meetellen.</p>

      <NuxtLink to="/inkomen/waterval" class="link-card">
        <span>Waar gaat je basis heen?<br /><span class="link-card-sub">vaste lasten · sparen · potjes · vrij</span></span>
        <span class="chevron">›</span>
      </NuxtLink>

      <NuxtLink v-if="meevaller > 0" to="/inkomen/meevaller" class="windfall-card">
        <span>{{ formatEuros(meevaller) }} meevaller<br /><span class="link-card-sub">nog niet verdeeld</span></span>
        <span class="chevron">›</span>
      </NuxtLink>

      <NuxtLink to="/inkomen/minder" class="minder-card">
        <span>Wat als je inkomen daalt?<br /><span class="link-card-sub">reken een lager inkomen door</span></span>
        <span class="chevron chevron--accent">›</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.inkomen-screen {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 1180px;
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
  border-radius: 30px;
  padding: 28px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-label {
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.hero-figure {
  font-family: var(--font-heading);
  font-size: 50px;
  line-height: 1;
  color: var(--ink-deep);
  margin-top: 6px;
}

.hero-sub {
  font-size: 13px;
  color: var(--color-neutral-700);
  max-width: 220px;
}

.chart-card {
  background: var(--card);
  border-radius: 30px;
  box-shadow: var(--shadow-sm);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chart-overline {
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.chart {
  height: 140px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  position: relative;
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
  align-items: flex-end;
  height: 100%;
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

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--color-neutral-600);
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-deep);
}

.chart-legend-line {
  width: 18px;
  border-top: 1.5px dashed var(--ink);
}

.chart-note {
  margin: 0;
  font-size: 12px;
  color: var(--color-neutral-600);
}

.source-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.source-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: none;
  border-radius: 22px;
  box-shadow: inset 0 0 0 1.5px var(--color-neutral-300);
  padding: 18px;
  font-size: 14.5px;
  cursor: pointer;
  text-align: left;
}

.source-card--excluded {
  box-shadow: inset 0 0 0 1.5px var(--color-accent);
  background: var(--color-accent-100);
}

.source-amount {
  text-align: right;
  flex: none;
}

.source-flag {
  font-size: 11.5px;
  color: var(--ink);
}

.source-flag--excluded {
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
  font-size: 13px;
  color: var(--color-neutral-700);
  margin: 0;
}

.link-card,
.windfall-card,
.minder-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-radius: 24px;
  padding: 20px;
  font-size: 14px;
  text-decoration: none;
}

.link-card-sub {
  font-size: 12px;
  color: var(--color-neutral-700);
}

.chevron {
  flex: none;
  font-size: 19px;
  color: var(--color-neutral-700);
}

.chevron--accent {
  color: var(--color-accent-700);
}

.link-card {
  background: var(--card);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
}

.link-card:hover {
  box-shadow: var(--shadow-md);
}

.windfall-card {
  background: var(--soft);
  border: 1.5px solid var(--ink);
  color: var(--ink-deep);
}

.windfall-card:hover {
  background: var(--soft-pressed);
}

.minder-card {
  box-shadow: inset 0 0 0 1.5px var(--color-accent);
  background: var(--color-accent-100);
  color: var(--color-accent-800);
}

.minder-card:hover {
  background: var(--color-accent-200);
}
</style>
