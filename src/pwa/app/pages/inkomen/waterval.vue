<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { loadWaterfall } from '../../composables/useWaterfall'
import type { WaterfallResult } from '../../lib/domain/waterfall'

useScreenHeader().set('Waterval', 'De volgorde waarin je basisinkomen wordt verdeeld.', {
  back: { to: '/inkomen', label: 'Inkomen' },
})

const result = ref<WaterfallResult | null>(null)

onMounted(async () => {
  result.value = await loadWaterfall()
})
</script>

<template>
  <div v-if="result" class="waterval">
    <div class="step step--base">
      <span>Basisinkomen</span>
      <span>{{ formatEuros(result.basis) }}</span>
    </div>

    <div class="step" :class="{ 'step--changed': result.vasteLasten > 0 }">
      <span>Vaste lasten</span>
      <span>−{{ formatEuros(result.vasteLasten) }}</span>
    </div>

    <div class="step" :class="{ 'step--changed': result.sparen > 0 }">
      <span>Sparen & beleggen</span>
      <span>−{{ formatEuros(result.sparen) }}</span>
    </div>

    <div class="step" :class="{ 'step--changed': result.potjesBudget > 0 }">
      <span>Potjes</span>
      <span>−{{ formatEuros(result.potjesBudget) }}</span>
    </div>

    <div class="step">
      <span>Overig huishouden</span>
      <span>{{ formatEuros(0) }}</span>
    </div>

    <div class="result-panel">
      <div class="result-label">Vrij te besteden</div>
      <div class="result-figure">{{ formatEuros(result.vrij) }}</div>
      <p class="result-note">
        Dit is het getal op je startscherm. Zeg een abonnement op of verhoog je inleg en het schuift meteen mee.
      </p>
    </div>
  </div>
</template>

<style scoped>
.waterval {
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: var(--radius-row);
  font-size: 14.5px;
  margin-left: 40px;
}

.step--base {
  margin-left: 0;
  background: var(--soft);
  border: 1.5px solid var(--color-text);
  font-family: var(--font-heading);
  font-size: 20px;
}

.step--changed {
  border: 1.5px solid var(--ink);
  background: var(--soft);
}

.result-panel {
  margin-top: 12px;
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 30px;
}

.result-label {
  font-size: 13.5px;
  color: var(--ink-deep);
}

.result-figure {
  font-family: var(--font-heading);
  font-size: 40px;
  color: var(--color-accent-700);
  margin-top: 4px;
}

.result-note {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-neutral-700);
}
</style>
