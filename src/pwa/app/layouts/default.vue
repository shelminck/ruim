<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppMobileTabBar from '../components/AppMobileTabBar.vue'
import GezinslidPicker from '../components/GezinslidPicker.vue'
import UnlockGate from '../components/UnlockGate.vue'
</script>

<template>
  <div class="shell">
    <AppSidebar class="sidebar-slot" />
    <main class="content">
      <AppHeader />
      <slot />
    </main>
    <AppMobileTabBar class="tab-bar-slot" />
    <GezinslidPicker />
    <UnlockGate />
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

.tab-bar-slot {
  display: none;
}

/* Sidebar + two-column content above ~1100px; single column with a bottom
   tab bar below that — see design handoff README, "Responsive". */
@media (max-width: 1100px) {
  .sidebar-slot {
    display: none;
  }

  .content {
    padding: 20px 16px 110px;
  }

  .tab-bar-slot {
    display: flex;
  }
}
</style>
