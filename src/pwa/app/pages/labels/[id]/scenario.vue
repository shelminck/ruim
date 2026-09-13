<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatEuros } from '../../../lib/domain/format'
import { computeLabelStats, type LabelStats } from '../../../lib/domain/labels'
import { getLabel } from '../../../lib/db/labels'
import { getDb } from '../../../lib/db/client'
import type { Label } from '../../../lib/domain/types'

const route = useRoute()
const screenHeader = useScreenHeader()

screenHeader.set('Zonder …', 'schatting op basis van 12 maanden', {
  back: { to: `/labels/${route.params.id}`, label: 'Label' },
})

const label = ref<Label | null>(null)
const stats = ref<LabelStats | null>(null)

onMounted(async () => {
  const id = String(route.params.id)
  const [found, db] = await Promise.all([getLabel(id), getDb()])
  if (!found) {
    label.value = null
    return
  }
  label.value = found
  stats.value = computeLabelStats(id, await db.getAll('transactions'))
  screenHeader.set(`Zonder ${found.name}`, 'schatting op basis van 12 maanden', {
    back: { to: `/labels/${id}`, label: found.name },
  })
})
</script>

<template>
  <div v-if="!label" class="not-found">Dit label bestaat niet (meer).</div>

  <div v-else class="scenario-screen">
    <p class="intro">
      Als "{{ label.name }}" helemaal wegvalt — geen enkele transactie met dit label meer — dan bespaar je dit:
    </p>

    <div class="saving-panel">
      <div class="saving-label">netto besparing per maand</div>
      <div class="saving-figure">{{ stats ? formatEuros(stats.monthlyAverageCents) : '—' }}</div>
      <div class="yearly-line">{{ stats ? formatEuros(stats.yearlyCents) : '—' }} per jaar</div>
    </div>

    <p class="footnote">
      Dit is een eenvoudige schatting op basis van je eigen uitgavengeschiedenis met dit label — eenmalige effecten
      (zoals verkoopopbrengst) zitten er niet in, en nieuwe kosten die ervoor in de plaats komen ook niet.
    </p>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--color-neutral-700);
}

.scenario-screen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 520px;
}

.intro {
  font-size: 14px;
  color: var(--color-text);
  margin: 0;
}

.saving-panel {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 30px;
}

.saving-label {
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.saving-figure {
  font-family: var(--font-heading);
  font-size: 44px;
  line-height: 1;
  color: var(--color-accent-700);
  margin-top: 4px;
}

.yearly-line {
  font-size: 13px;
  color: var(--color-neutral-700);
  margin-top: 6px;
}

.footnote {
  font-size: 12.5px;
  color: var(--color-neutral-600);
  margin: 0;
}
</style>
