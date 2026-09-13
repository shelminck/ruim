<script setup lang="ts">
import { CheckCircle, Home, List, PiggyBank, TrendingUp } from 'lucide-vue-next'
import { useNakijkenCount } from '../composables/useNakijkenCount'

const { count: nakijkenCount } = useNakijkenCount()

// Matches the mobile prototype's tab bar exactly (Prototype Ruim.dc.html,
// `const tabs = [...]`) — 5 items, no "Te doen" (desktop-only in the
// prototype; reachable from Nu's link list on mobile instead).
const tabs = [
  { to: '/nu', label: 'Nu', icon: Home },
  { to: '/alles', label: 'Alles', icon: List },
  { to: '/nakijken', label: 'Nakijken', icon: CheckCircle, badge: nakijkenCount },
  { to: '/potjes', label: 'Potjes', icon: PiggyBank },
  { to: '/vooruit', label: 'Vooruit', icon: TrendingUp },
]

function badgeLabel(value: number): string {
  return value > 99 ? '99+' : String(value)
}
</script>

<template>
  <nav class="tab-bar">
    <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab" active-class="tab--active">
      <span class="tab-icon-wrap">
        <component :is="tab.icon" :size="21" :stroke-width="2.75" />
        <span v-if="tab.badge && tab.badge.value > 0" class="tab-badge">{{ badgeLabel(tab.badge.value) }}</span>
      </span>
      <span class="tab-label">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 14px;
  height: 62px;
  border-radius: 999px;
  background: var(--card);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  z-index: 20;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-neutral-600);
  text-decoration: none;
  min-width: 0;
}

.tab--active {
  color: var(--ink);
}

.tab-icon-wrap {
  position: relative;
  display: flex;
}

.tab-badge {
  position: absolute;
  top: -5px;
  right: -10px;
  border-radius: 999px;
  background: var(--color-accent);
  color: #fff;
  font-size: 9px;
  line-height: 1;
  padding: 2px 4px;
  min-width: 14px;
  text-align: center;
}

.tab-label {
  font-size: 9.5px;
  white-space: nowrap;
}
</style>
