<script setup lang="ts">
defineProps<{ note?: string }>()
</script>

<template>
  <div class="coming-soon">
    <p>Dit scherm komt in een latere bouwstap. Zie de build-volgorde in <code>docs/design/</code>.</p>
    <p v-if="note" class="note">{{ note }}</p>
  </div>
</template>

<style scoped>
.coming-soon {
  background: var(--soft);
  border-radius: var(--radius-panel-lg);
  padding: 26px;
  color: var(--ink-deep);
  font-size: 14px;
  max-width: 560px;
}

.note {
  margin-top: 8px;
  color: var(--color-neutral-700);
  font-size: 13px;
}
</style>
