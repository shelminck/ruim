<script setup lang="ts">
import { computed } from 'vue'
import type { Stand } from '../lib/domain/budget'

const props = withDefaults(
  defineProps<{
    stand: Stand
    size?: number
    /** What's behind the merkteken, so the inner cutout can match it. */
    surface?: 'bg' | 'card'
    /** The hero panel gets a subtle white ring so the mark reads on navy. */
    heroRing?: boolean
  }>(),
  { size: 30, surface: 'card', heroRing: false },
)

const STAND_STYLE: Record<Stand, { disc: string; innerPct: number; insetPct: number }> = {
  ruim: { disc: 'var(--ink)', innerPct: 54, insetPct: 9 },
  krap: { disc: 'var(--color-accent)', innerPct: 36, insetPct: 15 },
  op: { disc: 'var(--color-accent-900)', innerPct: 18, insetPct: 20 },
}

const style = computed(() => STAND_STYLE[props.stand])
const cutoutColor = computed(() => (props.surface === 'card' ? 'var(--card)' : 'var(--color-bg)'))
</script>

<template>
  <span
    class="merkteken"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: style.disc,
      boxShadow: heroRing ? '0 0 0 1.5px rgba(255,255,255,.45)' : undefined,
    }"
  >
    <span
      class="merkteken-inner"
      :style="{
        width: `${style.innerPct}%`,
        height: `${style.innerPct}%`,
        right: `${style.insetPct}%`,
        bottom: `${style.insetPct}%`,
        background: cutoutColor,
      }"
    />
  </span>
</template>

<style scoped>
.merkteken {
  display: block;
  position: relative;
  flex: none;
  border-radius: 999px;
  overflow: hidden;
}

.merkteken-inner {
  position: absolute;
  border-radius: 999px;
}
</style>
