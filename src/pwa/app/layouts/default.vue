<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="content">
      <AppHeader />
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

.content {
  flex: 1;
  min-width: 0;
  padding: 30px 42px 64px;
}
</style>
