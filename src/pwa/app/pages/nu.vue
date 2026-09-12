<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDb } from '../lib/db/client'
import { listEnvelopes } from '../lib/db/envelopes'
import { aggregateProgress, currentMonthKey, envelopeProgress, spentCentsForEnvelope } from '../lib/domain/budget'
import { formatEuros } from '../lib/domain/format'
import { loadWaterfall } from '../composables/useWaterfall'
import type { Envelope, Transaction } from '../lib/domain/types'
import type { WaterfallResult } from '../lib/domain/waterfall'

useScreenHeader().set('Nu', 'Het overzicht: wat je nog kunt uitgeven, je potjes en wat er nog moet gebeuren.')

const waterfall = ref<WaterfallResult | null>(null)
const envelopes = ref<Envelope[]>([])
const spentByEnvelope = ref<Record<string, number>>({})
const labelCount = ref(0)
const reviewQueue = ref<Transaction[]>([])

async function load() {
  const [wf, allEnvelopes, db] = await Promise.all([loadWaterfall(), listEnvelopes(), getDb()])
  const [transactions, labels] = await Promise.all([db.getAll('transactions'), db.getAll('labels')])
  const month = currentMonthKey()

  waterfall.value = wf
  envelopes.value = allEnvelopes
  spentByEnvelope.value = Object.fromEntries(
    allEnvelopes.map((e) => [e.id, spentCentsForEnvelope(transactions, e.id, month)]),
  )
  labelCount.value = labels.length
  reviewQueue.value = transactions.filter((t) => t.envelopeId === null)
}

onMounted(load)

const progressList = computed(() =>
  envelopes.value.map((envelope) => ({
    envelope,
    progress: envelopeProgress(envelope, spentByEnvelope.value[envelope.id] ?? 0),
  })),
)

const monthStand = computed(() => aggregateProgress(progressList.value.map((p) => p.progress)))

const perDayLine = computed(() => {
  if (!waterfall.value) return ''
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const daysLeft = lastDay.getDate() - now.getDate() + 1
  if (waterfall.value.vrij <= 0 || daysLeft <= 0) return ''
  const perDay = Math.round(waterfall.value.vrij / daysLeft)
  const lastDayLabel = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long' }).format(lastDay)
  return `${formatEuros(perDay)} per dag tot ${lastDayLabel}`
})

const standExplanation: Record<string, string> = {
  ruim: 'je zit ruim onder budget deze maand.',
  krap: 'je nadert de grens van je potjes.',
  op: 'je hebt je budget deze maand bereikt.',
}

const standLabel = computed(() => monthStand.value.stand[0]!.toUpperCase() + monthStand.value.stand.slice(1))
</script>

<template>
  <div class="nu-screen">
    <div class="left-column">
      <div class="hero">
        <div class="hero-top">
          <Merkteken :stand="monthStand.stand" :size="88" surface="bg" hero-ring />
          <div class="hero-text">
            <div class="hero-label">
              je kunt nog uitgeven · <strong>{{ standLabel }}</strong>
            </div>
            <div class="hero-figure">{{ waterfall ? formatEuros(waterfall.vrij) : '—' }}</div>
            <div class="hero-sub">
              <template v-if="perDayLine">{{ perDayLine }} · </template>{{ standExplanation[monthStand.stand] }}
            </div>
          </div>
          <NuxtLink to="/inkomen/waterval" class="ghost-pill">Waar komt dit vandaan ›</NuxtLink>
        </div>
      </div>

      <div class="stat-grid">
        <NuxtLink to="/vaste-lasten" class="stat-card">
          <div class="stat-label">Vaste lasten</div>
          <div class="stat-figure">{{ waterfall ? formatEuros(waterfall.vasteLasten) : '—' }}</div>
        </NuxtLink>
        <NuxtLink to="/vooruit" class="stat-card">
          <div class="stat-label">Sparen & beleggen</div>
          <div class="stat-figure">{{ waterfall ? formatEuros(waterfall.sparen) : '—' }}</div>
        </NuxtLink>
        <NuxtLink to="/inkomen" class="stat-card">
          <div class="stat-label">Basisinkomen</div>
          <div class="stat-figure">{{ waterfall ? formatEuros(waterfall.basis) : '—' }}</div>
        </NuxtLink>
        <NuxtLink to="/labels" class="stat-card">
          <div class="stat-label">Labels</div>
          <div class="stat-figure">{{ labelCount }}</div>
        </NuxtLink>
      </div>
    </div>

    <div class="right-column">
      <div class="panel">
        <div class="panel-title-row">
          <h2 class="panel-title">Potjes</h2>
          <NuxtLink to="/potjes" class="panel-link">alles ›</NuxtLink>
        </div>
        <div v-if="progressList.length === 0" class="empty-note">Nog geen potjes aangemaakt.</div>
        <div v-for="{ envelope, progress } in progressList" :key="envelope.id" class="envelope-row">
          <Merkteken :stand="progress.stand" :size="26" />
          <div class="envelope-row-text">
            <span>{{ envelope.name }}</span>
            <span :class="{ overspent: progress.remainingCents < 0 }">{{ formatEuros(progress.remainingCents) }}</span>
          </div>
          <div class="mini-track">
            <div
              class="mini-fill"
              :class="`mini-fill--${progress.stand}`"
              :style="{ width: `${Math.min(100, progress.ratio * 100)}%` }"
            />
          </div>
        </div>
      </div>

      <div class="panel panel--soft">
        <h2 class="panel-title">Nakijken</h2>
        <div v-if="reviewQueue.length === 0" class="empty-note">Niets meer na te kijken.</div>
        <template v-else>
          <div v-for="tx in reviewQueue.slice(0, 3)" :key="tx.id" class="review-row">
            <span>{{ tx.counterparty }}</span>
            <span>{{ formatEuros(tx.amountCents) }}</span>
          </div>
          <NuxtLink to="/nakijken" class="review-button">
            {{ reviewQueue.length }} nakijken · begin bij {{ reviewQueue[0]!.counterparty }}
          </NuxtLink>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nu-screen {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 24px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero {
  background: var(--ink);
  border-radius: var(--radius-hero);
  padding: 38px 40px;
  color: #fff;
}

.hero-top {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-text {
  flex: 1 1 240px;
  min-width: 0;
}

.hero-label {
  font-size: 14.5px;
  color: rgba(255, 255, 255, 0.82);
}

.hero-label strong {
  color: #fff;
}

.hero-figure {
  font-family: var(--font-heading);
  /* Narrower vw multiplier than the design spec's clamp(56px, 6.4vw, 86px):
     that figure assumed the full 1320px prototype viewport, not a ~1.3fr
     column inside a two-column shell. */
  font-size: clamp(40px, 4vw, 76px);
  line-height: 0.92;
  margin-top: 4px;
}

.hero-sub {
  margin-top: 8px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.82);
}

.ghost-pill {
  flex: none;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  color: #fff;
  text-decoration: none;
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.55);
  white-space: nowrap;
}

.ghost-pill:hover {
  background: rgba(255, 255, 255, 0.12);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 18px 20px;
  text-decoration: none;
  color: inherit;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
}

.stat-label {
  font-size: 10.5px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.stat-figure {
  font-family: var(--font-heading);
  font-size: 24px;
  margin-top: 6px;
  color: var(--ink-deep);
}

.panel {
  background: var(--card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel--soft {
  background: var(--soft);
  box-shadow: none;
}

.panel-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 17px;
}

.panel-link {
  font-size: 13px;
  color: var(--color-accent);
  text-decoration: none;
}

.empty-note {
  font-size: 13px;
  color: var(--color-neutral-600);
}

.envelope-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: center;
}

.envelope-row-text {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--ink-deep);
}

.overspent {
  color: var(--color-accent-700);
}

.mini-track {
  grid-column: 2;
  height: 8px;
  border-radius: 999px;
  background: var(--color-neutral-200);
  overflow: hidden;
}

.mini-fill {
  height: 100%;
}

.mini-fill--ruim {
  background: var(--ink);
}

.mini-fill--krap {
  background: var(--color-accent);
}

.mini-fill--op {
  background: var(--color-text);
}

.review-row {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--ink-deep);
}

.review-button {
  display: block;
  text-align: center;
  margin-top: 4px;
  padding: 14px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 13.5px;
  text-decoration: none;
}

.review-button:hover {
  background: var(--ink-deep);
}
</style>
