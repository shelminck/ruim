<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useNakijkenCount } from '../composables/useNakijkenCount'
import { useScreenHeader } from '../composables/useScreenHeader'
import { getDb } from '../lib/db/client'
import { spentCentsForDay } from '../lib/domain/budget'
import { formatEuros } from '../lib/domain/format'

const { title, subtitle, back, hideOnMobile } = useScreenHeader()
const { count: nakijkenCount } = useNakijkenCount()

const monthLabel = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(new Date())
const todayCents = ref(0)

onMounted(async () => {
  const db = await getDb()
  const transactions = await db.getAll('transactions')
  todayCents.value = spentCentsForDay(transactions, new Date().toISOString().slice(0, 10))
})
</script>

<template>
  <header class="header">
    <NuxtLink v-if="back" :to="back.to" class="back-link">‹ {{ back.label }}</NuxtLink>

    <div class="titles" :class="{ 'titles--hide-mobile': hideOnMobile }">
      <h1 class="title">{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>

    <div class="pills">
      <span class="pill">{{ monthLabel }}</span>
      <span class="pill">Vandaag {{ formatEuros(todayCents) }}</span>
      <NuxtLink v-if="nakijkenCount > 0" to="/nakijken" class="pill pill--accent">
        {{ nakijkenCount }} na te kijken
      </NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: 26px;
}

.back-link {
  display: none;
}

.title {
  font-size: 32px;
  line-height: 1.1;
  color: var(--color-text);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13.5px;
  color: var(--color-neutral-700);
}

.pills {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--color-neutral-300);
  font-size: 13px;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
}

.pill--accent {
  border-color: var(--color-accent);
  background: var(--color-accent-100);
  color: var(--color-accent-700);
}

.pill--accent:hover {
  background: var(--color-accent-200);
}

/* Mobile prototype has no shared pill header: sub-screens get a "‹ Vorige"
   link instead of the month/nakijken pills; see design handoff README,
   "Responsive" and the per-screen "‹ terug" affordance. Placed last so it
   wins the cascade over the unconditional rules above at equal specificity. */
@media (max-width: 1100px) {
  .title {
    font-size: 24px;
  }

  .back-link {
    display: block;
    flex-basis: 100%;
    font-size: 13px;
    color: var(--color-neutral-700);
    text-decoration: none;
  }

  .titles--hide-mobile {
    display: none;
  }

  .pills {
    display: none;
  }
}
</style>
