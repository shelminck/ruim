<script setup lang="ts">
import { CheckCircle, Home, List, ListCheck, PiggyBank, TrendingUp } from 'lucide-vue-next'
import { useNakijkenCount } from '../composables/useNakijkenCount'

const { count: nakijkenCount } = useNakijkenCount()

const primaryNav = [
  { to: '/nu', label: 'Nu', icon: Home },
  { to: '/alles', label: 'Alles', icon: List },
  { to: '/nakijken', label: 'Nakijken', icon: CheckCircle, badge: nakijkenCount },
  { to: '/te-doen', label: 'Te doen', icon: ListCheck },
  { to: '/potjes', label: 'Potjes', icon: PiggyBank },
  { to: '/vooruit', label: 'Vooruit', icon: TrendingUp },
]

const secondaryNav = [
  { to: '/vaste-lasten', label: 'Vaste lasten' },
  { to: '/inkomen', label: 'Inkomen' },
  { to: '/labels', label: 'Labels' },
  { to: '/importeren', label: 'MT940 importeren' },
]

function badgeLabel(value: number): string {
  return value > 99 ? '99+' : String(value)
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-mark">R</span>
      <span class="brand-name">Ruim</span>
    </div>

    <nav class="nav-group">
      <NuxtLink
        v-for="item in primaryNav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        active-class="nav-item--active"
      >
        <component :is="item.icon" :size="20" :stroke-width="2.75" />
        <span class="nav-label">{{ item.label }}</span>
        <span v-if="item.badge && item.badge.value > 0" class="nav-badge">
          {{ badgeLabel(item.badge.value) }}
        </span>
      </NuxtLink>
    </nav>

    <div class="nav-overline">INSTELLEN</div>

    <nav class="nav-group">
      <NuxtLink
        v-for="item in secondaryNav"
        :key="item.to"
        :to="item.to"
        class="nav-item nav-item--secondary"
        active-class="nav-item--secondary-active"
      >
        <span class="nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="sidebar-spacer" />

    <div class="household-card">
      <div class="avatars">
        <span class="avatar avatar--one" />
        <span class="avatar avatar--two" />
      </div>
      <div class="household-text">
        <div class="household-names">Sanne & Mark</div>
        <div class="household-sub">gedeeld huishouden</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 274px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: var(--card);
  box-shadow: var(--shadow-sm);
  padding: 28px 20px 24px;
  min-height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  margin-bottom: 24px;
}

.brand-mark {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-text);
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 999px;
  color: var(--color-text);
  text-decoration: none;
  font-size: 14px;
}

.nav-item:hover {
  background: var(--nav-hover-blue);
  color: var(--ink-deep);
}

.nav-item--active {
  background: var(--ink);
  color: #fff;
}

.nav-label {
  flex: 1;
}

.nav-badge {
  flex: none;
  min-width: 22px;
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--color-accent);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  text-align: center;
}

.nav-overline {
  margin: 20px 14px 8px;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.nav-item--secondary {
  font-size: 13.5px;
}

.nav-item--secondary:hover {
  background: var(--soft);
  color: var(--ink-deep);
}

.nav-item--secondary-active {
  background: var(--soft);
  color: var(--ink-deep);
}

.sidebar-spacer {
  flex: 1;
}

.household-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 24px;
  background: var(--soft);
  margin-top: 16px;
}

.avatars {
  display: flex;
  flex: none;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1.5px solid var(--color-text);
}

.avatar--one {
  background: var(--color-accent-300);
}

.avatar--two {
  background: var(--color-neutral-300);
  margin-left: -10px;
}

.household-names {
  font-size: 13.5px;
  color: var(--ink-deep);
  font-weight: 600;
}

.household-sub {
  font-size: 11.5px;
  color: var(--color-neutral-700);
}
</style>
