<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatEuros } from '../../lib/domain/format'
import { loadWaterfall } from '../../composables/useWaterfall'
import type { WaterfallResult } from '../../lib/domain/waterfall'

useScreenHeader().set('Waar gaat je basis heen', 'de volgorde van je maand', {
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

    <NuxtLink to="/vaste-lasten" class="step">
      <span>Vaste lasten<br /><span class="step-sub">24 terugkerende betalingen</span></span>
      <span>−{{ formatEuros(result.vasteLasten) }}</span>
    </NuxtLink>

    <NuxtLink to="/vooruit" class="step step--changed">
      <span>Sparen & beleggen<br /><span class="step-sub">vóór de rest opzij</span></span>
      <span>−{{ formatEuros(result.sparen) }}</span>
    </NuxtLink>

    <NuxtLink to="/potjes" class="step">
      <span>Potjes<br /><span class="step-sub">boodschappen, vervoer, uit eten …</span></span>
      <span>−{{ formatEuros(result.potjesBudget) }}</span>
    </NuxtLink>

    <NuxtLink to="/alles" class="step">
      <span>Overig huishouden<br /><span class="step-sub">losse uitgaven zonder potje</span></span>
      <span>−{{ formatEuros(0) }}</span>
    </NuxtLink>

    <div class="result-panel">
      <span class="result-label">Vrij te besteden</span>
      <span class="result-figure">{{ formatEuros(result.vrij) }}</span>
    </div>
    <p class="result-note">
      Dit is het getal op je startscherm. Zeg een abonnement op of verhoog je inleg en het schuift meteen mee.
    </p>
  </div>
</template>

<style scoped>
.waterval {
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.step {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  border-radius: 22px;
  font-size: 14.5px;
  color: var(--color-text);
  text-decoration: none;
  margin-left: 40px;
  box-shadow: inset 0 0 0 1.5px var(--color-neutral-300);
  background: #fff;
}

.step-sub {
  font-size: 11.5px;
  color: var(--color-neutral-700);
}

.step--base {
  margin-left: 0;
  background: var(--soft);
  box-shadow: none;
  border: 1.5px solid var(--color-text);
  font-size: 15px;
}

.step--changed {
  box-shadow: inset 0 0 0 1.5px var(--ink);
  background: var(--soft);
}

.result-panel {
  margin-top: 6px;
  background: var(--soft);
  border-radius: 30px;
  padding: 26px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-label {
  font-size: 14.5px;
  color: var(--color-accent-800);
}

.result-figure {
  font-family: var(--font-heading);
  font-size: 40px;
  color: var(--color-accent-700);
}

.result-note {
  font-size: 13px;
  color: var(--color-neutral-700);
  border-left: 2px solid var(--color-accent);
  padding-left: 13px;
  margin: 0;
}
</style>
