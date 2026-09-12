<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatEuros } from '../lib/domain/format'
import { currentMonthKey } from '../lib/domain/budget'
import { deriveTasks, type DerivedTask } from '../lib/domain/tasks'
import { getBuffer } from '../lib/db/buffer'
import { getInvesting } from '../lib/db/investing'
import { listGoals } from '../lib/db/goals'
import { listSubscriptions } from '../lib/db/subscriptions'
import { getMonthlyAdjustment } from '../lib/db/monthly-adjustments'
import { getDb } from '../lib/db/client'
import { listTaskStatesForMonth, saveTaskState } from '../lib/db/task-state'
import { useTeDoenCount } from '../composables/useTeDoenCount'
import type { TaskGroup, TaskState } from '../lib/domain/types'

useScreenHeader().set('Te doen', 'De handmatige overboekingen en taken die uit je plan volgen.')

const { refresh: refreshTeDoenCount } = useTeDoenCount()

const month = currentMonthKey()
const tasks = ref<DerivedTask[]>([])
const states = ref<Record<string, TaskState>>({})
const collapsed = ref<Record<TaskGroup, boolean>>({ overboeken: false, regelen: false })

async function load() {
  const db = await getDb()
  const [buffer, investing, goals, subscriptions, adjustment, transactions, taskStates] = await Promise.all([
    getBuffer(),
    getInvesting(),
    listGoals(),
    listSubscriptions(),
    getMonthlyAdjustment(month),
    db.getAll('transactions'),
    listTaskStatesForMonth(month),
  ])

  const reviewQueueCount = transactions.filter((t) => t.envelopeId === null).length

  tasks.value = deriveTasks({ month, buffer, investing, goals, subscriptions, adjustment, reviewQueueCount })
  states.value = Object.fromEntries(taskStates.map((s) => [s.id, s]))
}

onMounted(load)

function stateFor(id: string): TaskState {
  return states.value[id] ?? { id, month, done: false, dismissed: false }
}

const groups: { key: TaskGroup; label: string }[] = [
  { key: 'overboeken', label: 'Overboeken' },
  { key: 'regelen', label: 'Regelen' },
]

function tasksInGroup(group: TaskGroup): DerivedTask[] {
  return tasks.value.filter((t) => t.group === group && !stateFor(t.id).dismissed)
}

function openCountInGroup(group: TaskGroup): number {
  return tasksInGroup(group).filter((t) => !stateFor(t.id).done).length
}

function totalInGroup(group: TaskGroup): number {
  return tasksInGroup(group)
    .filter((t) => t.group === 'overboeken' && !t.reverse && !stateFor(t.id).done)
    .reduce((sum, t) => sum + (t.amountCents ?? 0), 0)
}

const openTotalCents = computed(() => totalInGroup('overboeken'))
const openCountTotal = computed(() => groups.reduce((sum, g) => sum + openCountInGroup(g.key), 0))

async function toggleDone(task: DerivedTask) {
  const current = stateFor(task.id)
  const next = { ...current, done: !current.done }
  states.value = { ...states.value, [task.id]: next }
  await saveTaskState(next)
  await refreshTeDoenCount()
}

async function dismiss(task: DerivedTask) {
  const current = stateFor(task.id)
  const next = { ...current, dismissed: true }
  states.value = { ...states.value, [task.id]: next }
  await saveTaskState(next)
  await refreshTeDoenCount()
}

function toggleCollapsed(group: TaskGroup) {
  collapsed.value = { ...collapsed.value, [group]: !collapsed.value[group] }
}
</script>

<template>
  <div class="te-doen-screen">
    <div class="left-column">
      <div v-for="group in groups" :key="group.key" class="group-block">
        <button type="button" class="group-header" @click="toggleCollapsed(group.key)">
          <span class="chevron">{{ collapsed[group.key] ? '▸' : '▾' }}</span>
          <span class="group-name">{{ group.label }}</span>
          <span class="group-progress">
            {{ tasksInGroup(group.key).length - openCountInGroup(group.key) }} van {{ tasksInGroup(group.key).length }} open
          </span>
          <span v-if="group.key === 'overboeken'" class="group-total">{{ formatEuros(totalInGroup(group.key)) }}</span>
        </button>

        <div v-if="!collapsed[group.key]" class="task-list">
          <div v-if="tasksInGroup(group.key).length === 0" class="empty-note">Niets hier deze maand.</div>

          <div
            v-for="task in tasksInGroup(group.key)"
            :key="task.id"
            class="task-row"
            :class="{ 'task-row--done': stateFor(task.id).done, 'task-row--reverse': task.reverse }"
          >
            <button
              v-if="!task.route"
              type="button"
              class="checkbox"
              :class="{ 'checkbox--done': stateFor(task.id).done }"
              @click="toggleDone(task)"
            >
              <span v-if="stateFor(task.id).done">✓</span>
            </button>
            <div v-else class="checkbox checkbox--spacer" />

            <div class="task-text">
              <div class="task-title">{{ task.title }}</div>
              <div v-if="task.subtitle" class="task-subtitle">{{ task.subtitle }}</div>
            </div>

            <div v-if="task.amountCents !== null" class="task-amount">{{ formatEuros(task.amountCents) }}</div>

            <NuxtLink v-if="task.route" :to="task.route" class="pill-button">Openen</NuxtLink>
            <button v-else type="button" class="pill-button" @click="toggleDone(task)">
              {{ stateFor(task.id).done ? 'Ongedaan' : 'Gedaan' }}
            </button>

            <button type="button" class="dismiss-button" @click="dismiss(task)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <div class="right-column">
      <div class="summary-panel">
        <div class="summary-label">nog over te boeken</div>
        <div class="summary-figure">{{ formatEuros(openTotalCents) }}</div>
        <div class="summary-sub">{{ openCountTotal }} open · vink af wat je hebt gedaan</div>
      </div>

      <div class="tip-card">
        Zet de vaste overboekingen één keer als periodieke opdracht in je bank. Dan blijven hier alleen de eenmalige
        dingen staan.
      </div>

      <p class="disclaimer">
        Afvinken verandert je saldo niet — Ruim gelooft je pas als de transactie in je import staat.
      </p>
    </div>
  </div>
</template>

<style scoped>
.te-doen-screen {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 980px;
}

@media (max-width: 1100px) {
  .te-doen-screen {
    grid-template-columns: 1fr;
  }
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 4px 0;
  cursor: pointer;
  text-align: left;
}

.chevron {
  color: var(--color-neutral-600);
  width: 14px;
}

.group-name {
  font-family: var(--font-heading);
  font-size: 17px;
}

.group-progress {
  font-size: 12px;
  color: var(--color-neutral-600);
}

.group-total {
  margin-left: auto;
  font-family: var(--font-heading);
  font-size: 14px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.empty-note {
  font-size: 13px;
  color: var(--color-neutral-600);
  padding: 4px 0;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1.5px solid var(--color-neutral-300);
  border-radius: var(--radius-row);
  padding: 12px 16px;
}

.task-row--reverse {
  background: var(--soft);
  border-color: var(--ink);
}

.task-row--done {
  background: var(--color-neutral-100);
  opacity: 0.55;
}

.task-row--done .task-title,
.task-row--done .task-amount {
  text-decoration: line-through;
}

.checkbox {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: var(--radius-checkbox);
  border: 1.5px solid var(--color-neutral-400);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
}

.checkbox--spacer {
  border: none;
  cursor: default;
}

.checkbox--done {
  background: var(--color-accent-700);
  border-color: var(--color-accent-700);
}

.task-text {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
}

.task-subtitle {
  font-size: 11.5px;
  color: var(--color-neutral-600);
  margin-top: 2px;
}

.task-amount {
  font-family: var(--font-heading);
  font-size: 15px;
  white-space: nowrap;
}

.pill-button {
  border: 1px solid var(--color-neutral-300);
  background: #fff;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: none;
  color: var(--color-text);
  white-space: nowrap;
}

.dismiss-button {
  border: none;
  background: transparent;
  color: var(--color-neutral-500);
  cursor: pointer;
  font-size: 14px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-panel {
  background: var(--ink);
  color: #fff;
  border-radius: var(--radius-panel-lg);
  padding: 26px;
}

.summary-label {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.82);
}

.summary-figure {
  font-family: var(--font-heading);
  font-size: 46px;
  margin-top: 4px;
}

.summary-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 6px;
}

.tip-card {
  background: var(--color-accent-100);
  color: var(--color-accent-800);
  border-radius: var(--radius-callout);
  padding: 16px;
  font-size: 13px;
}

.disclaimer {
  font-size: 12px;
  color: var(--color-neutral-600);
}
</style>
