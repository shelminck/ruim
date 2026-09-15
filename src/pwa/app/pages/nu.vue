<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDb } from '../lib/db/client'
import { listEnvelopes } from '../lib/db/envelopes'
import { getBuffer, saveBuffer } from '../lib/db/buffer'
import { listIncomeSources } from '../lib/db/income-sources'
import { aggregateProgress, currentMonthKey, envelopeProgress, spentCentsForDay, spentCentsForEnvelope } from '../lib/domain/budget'
import { formatEuros, monthDaysLeftLabel } from '../lib/domain/format'
import { loadWaterfall } from '../composables/useWaterfall'
import { useNakijkenCount } from '../composables/useNakijkenCount'
import { useTeDoenCount } from '../composables/useTeDoenCount'
import type { Envelope, Transaction } from '../lib/domain/types'
import type { WaterfallResult } from '../lib/domain/waterfall'

// Header title/subtitle for this screen are the greeting itself, on every
// breakpoint — see design handoff, Prototype Ruim Desktop.dc.html:1022
// (`nu: ['Goeiemorgen, Sanne', 'september · nog 11 dagen']`), not a generic
// "Nu" title.
useScreenHeader().set('Goeiemorgen, Sanne', monthDaysLeftLabel(), { avatars: true })

const { count: nakijkenCount, refresh: refreshNakijkenCount } = useNakijkenCount()
const { count: teDoenCount, refresh: refreshTeDoenCount } = useTeDoenCount()

const waterfall = ref<WaterfallResult | null>(null)
const envelopes = ref<Envelope[]>([])
const spentByEnvelope = ref<Record<string, number>>({})
const labelCount = ref(0)
const reviewQueue = ref<Transaction[]>([])
const todayCents = ref(0)
const meevallerCents = ref(0)

// Session-only nudge: the design's coach card claims a fabricated "3 weeks
// ahead of pace" streak we have no data to back up (no streak-tracking
// feature exists). We show the same interaction — move a suggested amount
// to the buffer, or dismiss — without inventing a precision we don't have.
const COACH_SUGGESTION_CENTS = 4000
const coachDismissed = ref(false)

async function load() {
  const [wf, allEnvelopes, db, incomeSources] = await Promise.all([
    loadWaterfall(),
    listEnvelopes(),
    getDb(),
    listIncomeSources(),
  ])
  const [transactions, labels] = await Promise.all([db.getAll('transactions'), db.getAll('labels')])
  const month = currentMonthKey()

  waterfall.value = wf
  envelopes.value = allEnvelopes
  spentByEnvelope.value = Object.fromEntries(
    allEnvelopes.map((e) => [e.id, spentCentsForEnvelope(transactions, e.id, month)]),
  )
  labelCount.value = labels.length
  reviewQueue.value = transactions.filter((t) => t.envelopeId === null)
  todayCents.value = spentCentsForDay(transactions, new Date().toISOString().slice(0, 10))

  const binnen = incomeSources.reduce((sum, s) => sum + s.amountCents, 0)
  const basis = incomeSources.filter((s) => s.countsTowardBase).reduce((sum, s) => sum + s.amountCents, 0)
  meevallerCents.value = Math.max(0, binnen - basis)

  await refreshNakijkenCount()
  await refreshTeDoenCount()
}

onMounted(load)

async function coachDoen() {
  const buffer = await getBuffer()
  await saveBuffer({ ...buffer, savedCents: buffer.savedCents + COACH_SUGGESTION_CENTS })
  coachDismissed.value = true
}

function coachWeg() {
  coachDismissed.value = true
}

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

// Literal per-stand copy from the design (Prototype Ruim Desktop.dc.html:1166,
// `maandMerkUitleg`) — not a paraphrase. The "krap" line names the last day
// of the month; the prototype hardcodes "de 30e" for its September fixture,
// computed for real here instead.
const standExplanation = computed<Record<string, string>>(() => {
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  return {
    ruim: 'je ligt voor op je maand',
    krap: `let even op tot de ${lastDay}e`,
    op: 'je potjes zijn leeg',
  }
})

// Literal suffix from the design (Prototype Ruim.dc.html: `p.rest`), not
// just the bare currency figure.
function envelopeRestLabel(remainingCents: number): string {
  return remainingCents < 0 ? `${formatEuros(-remainingCents)} te veel` : `${formatEuros(remainingCents)} over`
}

const showCoach = computed(
  () => !coachDismissed.value && monthStand.value.stand === 'ruim' && (waterfall.value?.vrij ?? 0) > 0,
)
</script>

<template>
  <div class="nu-screen">
    <div class="left-column">
      <!-- Desktop hero — merkteken, stand suffix, explanation clause and the
           "Waar komt dit vandaan" link. Hidden on mobile, see .hero-mobile. -->
      <div class="hero">
        <div class="hero-top">
          <Merkteken :stand="monthStand.stand" :size="88" surface="bg" hero-ring />
          <div class="hero-text">
            <div class="hero-label">
              je kunt nog uitgeven · <span class="hero-stand">{{ monthStand.stand }}</span>
            </div>
            <div class="hero-figure">{{ waterfall ? formatEuros(waterfall.vrij) : '—' }}</div>
            <div class="hero-sub">
              <template v-if="perDayLine">{{ perDayLine }} · </template>{{ standExplanation[monthStand.stand] }}
            </div>
          </div>
          <NuxtLink to="/inkomen/waterval" class="ghost-pill">Waar komt dit vandaan ›</NuxtLink>
        </div>
      </div>

      <!-- Mobile hero — three plain lines, no merkteken/pill/explanation.
           See Prototype Ruim.dc.html, isNu block. -->
      <div class="hero-mobile">
        <div class="hero-label">je kunt nog uitgeven</div>
        <div class="hero-figure">{{ waterfall ? formatEuros(waterfall.vrij) : '—' }}</div>
        <div class="hero-sub">{{ perDayLine }}</div>
      </div>

      <div v-if="showCoach" class="coach-card">
        <p class="coach-text">Je zit deze maand ruim onder budget. Zal ik {{ formatEuros(COACH_SUGGESTION_CENTS) }} naar je buffer schuiven?</p>
        <div class="coach-actions">
          <button type="button" class="coach-button coach-button--fill" @click="coachDoen">Doen</button>
          <button type="button" class="coach-button coach-button--outline" @click="coachWeg">Liever niet</button>
        </div>
      </div>

      <div class="mobile-pills">
        <span class="mobile-pill">Vandaag {{ formatEuros(todayCents) }}</span>
        <NuxtLink v-if="nakijkenCount > 0" to="/nakijken" class="mobile-pill mobile-pill--accent">
          {{ nakijkenCount }} nakijken
        </NuxtLink>
      </div>

      <NuxtLink v-if="meevallerCents > 0" to="/inkomen/meevaller" class="meevaller-card">
        <span>
          {{ formatEuros(meevallerCents) }} meevaller
          <br />
          <span class="meevaller-sub">boven je basis · nog niet verdeeld</span>
        </span>
        <span>›</span>
      </NuxtLink>

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

      <!-- Mobile prototype layout below: a flat divider + list instead of
           the desktop stat-grid/panels — see Prototype Ruim.dc.html, isNu
           block, the potjes-rows + nav-links list under the divider. -->
      <div class="mobile-divider" />
      <div class="mobile-list">
        <NuxtLink v-for="{ envelope, progress } in progressList" :key="envelope.id" :to="`/potjes/${envelope.id}`" class="mobile-list-row">
          <span>{{ envelope.name }}</span>
          <span :class="{ overspent: progress.remainingCents < 0 }">{{ envelopeRestLabel(progress.remainingCents) }}</span>
        </NuxtLink>
        <NuxtLink to="/potjes" class="mobile-list-row mobile-list-row--muted">
          <span>Alle potjes en sparen</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/te-doen" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>Te doen{{ teDoenCount > 0 ? ` · ${teDoenCount} open` : '' }}</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/vaste-lasten" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>Vaste lasten · {{ waterfall ? formatEuros(waterfall.vasteLasten) : '—' }} p/m</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/labels" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>Labels · wat kost het ons?</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/inkomen" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>Inkomen · basis {{ waterfall ? formatEuros(waterfall.basis) : '—' }}</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/vooruit" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>Vooruit · sparen & beleggen</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/importeren" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>MT940 importeren</span>
          <span>›</span>
        </NuxtLink>
        <NuxtLink to="/account" class="mobile-list-row mobile-list-row--muted mobile-list-row--rule">
          <span>Account · beveiliging & gezinsleden</span>
          <span>›</span>
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

@media (max-width: 1100px) {
  .nu-screen {
    grid-template-columns: 1fr;
  }
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.coach-card {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.coach-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.45;
  color: var(--ink-deep);
}

.coach-actions {
  display: flex;
  gap: 10px;
}

.coach-button {
  flex: 1;
  border-radius: 999px;
  padding: 12px;
  text-align: center;
  font-family: var(--font-heading);
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.coach-button--fill {
  background: var(--ink);
  color: #fff;
}

.coach-button--fill:hover {
  background: var(--ink-deep);
}

.coach-button--outline {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--ink);
  color: var(--ink-deep);
}

.mobile-pills {
  display: none;
}

.mobile-pill {
  flex: 1;
  border-radius: 999px;
  border: 1.5px solid var(--color-neutral-300);
  padding: 10px;
  text-align: center;
  font-size: 12.5px;
  color: var(--color-neutral-800);
  text-decoration: none;
}

.mobile-pill--accent {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
  color: var(--color-accent-700);
}

.mobile-pill--accent:hover {
  background: var(--color-accent-200);
}

.meevaller-card {
  border-radius: var(--radius-row);
  border: 1.5px solid var(--ink);
  background: var(--soft);
  padding: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--ink-deep);
  font-size: 12.5px;
}

.meevaller-card:hover {
  background: var(--soft-pressed);
}

.meevaller-sub {
  font-size: 11.5px;
  color: var(--color-neutral-700);
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

.hero-stand {
  color: #fff;
}

.hero-figure {
  font-family: var(--font-heading);
  /* Narrower vw multiplier than the desktop design spec's
     clamp(56px, 6.4vw, 86px): that figure assumed the full 1320px prototype
     viewport, not a ~1.3fr column inside a two-column shell. */
  font-size: clamp(40px, 4vw, 76px);
  line-height: 0.92;
  margin-top: 4px;
}

.hero-sub {
  margin-top: 8px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.82);
}

/* Mobile hero — separate block, hidden by default (see .hero-mobile in the
   trailing media query). Fixed 60px figure and 32px radius per the mobile
   prototype, not the desktop clamp/36px. */
.hero-mobile {
  display: none;
  background: var(--ink);
  border-radius: 32px;
  padding: 26px;
  color: #fff;
  flex-direction: column;
  gap: 6px;
}

.hero-mobile .hero-figure {
  font-size: 60px;
  line-height: 0.95;
}

.hero-mobile .hero-sub {
  margin-top: 0;
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

.mobile-divider {
  display: none;
}

.mobile-list {
  display: none;
}

.mobile-list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 4px;
  font-size: 15px;
  color: var(--color-text);
  text-decoration: none;
  border-bottom: 1px solid var(--color-neutral-200);
}

.mobile-list-row:hover {
  background: var(--color-neutral-100);
}

.mobile-list-row--muted {
  font-size: 15px;
  color: var(--color-neutral-700);
}

.mobile-list-row--rule {
  border-top: 1px solid var(--color-neutral-200);
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

/* Placed last so it wins the cascade over the unconditional display:none
   rules above at equal specificity. */
@media (max-width: 1100px) {
  .hero {
    display: none;
  }

  .hero-mobile {
    display: flex;
  }

  .mobile-pills {
    display: flex;
    gap: 10px;
  }

  /* Mobile prototype has no stat-grid/panel cards — a flat divider + list
     instead (see Prototype Ruim.dc.html, isNu block). */
  .stat-grid,
  .right-column {
    display: none;
  }

  .mobile-divider {
    display: block;
    height: 1px;
    background: var(--color-neutral-200);
  }

  .mobile-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}
</style>
