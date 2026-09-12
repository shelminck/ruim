<script setup lang="ts">
import { useNakijkenCount } from '../composables/useNakijkenCount'
import { useScreenHeader } from '../composables/useScreenHeader'

const { title, subtitle } = useScreenHeader()
const { count: nakijkenCount } = useNakijkenCount()

const monthLabel = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(new Date())
</script>

<template>
  <header class="header">
    <div class="titles">
      <h1 class="title">{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>

    <div class="pills">
      <span class="pill">{{ monthLabel }}</span>
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

.title {
  font-size: 32px;
  line-height: 1.1;
  color: var(--color-text);
}

@media (max-width: 1100px) {
  .title {
    font-size: 24px;
  }

  .pills {
    flex-wrap: wrap;
  }
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
</style>
