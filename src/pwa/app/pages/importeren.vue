<script setup lang="ts">
import { importStatement, type ImportSummary } from '../lib/db/import'
import { parseMt940 } from '../lib/mt940/parser'
import { useNakijkenCount } from '../composables/useNakijkenCount'

useScreenHeader().set('MT940 importeren', 'bestand blijft op je apparaat', {
  back: { to: '/nu', label: 'Nu' },
})

const { refresh: refreshNakijkenCount } = useNakijkenCount()

const isDragging = ref(false)
const fileName = ref<string | null>(null)
const dateRange = ref<string | null>(null)
const iban = ref<string | null>(null)
const summary = ref<ImportSummary | null>(null)
const error = ref<string | null>(null)
const fileInput = useTemplateRef('fileInput')

function maskIban(value: string): string {
  // NL IBANs: "NL21 INGB ···45 67" — country+check, bank code, then only the last 4 digits.
  const compact = value.replace(/\s/g, '')
  const last4 = compact.slice(-4)
  return `${compact.slice(0, 4)} ${compact.slice(4, 8)} ···${last4.slice(0, 2)} ${last4.slice(2)}`
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return ''
  const sorted = [...dates].sort()
  const first = new Date(sorted[0]!)
  const last = new Date(sorted[sorted.length - 1]!)
  const day = new Intl.DateTimeFormat('nl-NL', { day: '2-digit' })
  const month = new Intl.DateTimeFormat('nl-NL', { month: 'short' })
  return `${day.format(first)}–${day.format(last)} ${month.format(last)}`
}

async function handleFile(file: File) {
  error.value = null
  summary.value = null
  fileName.value = file.name

  try {
    const content = await file.text()
    const parsed = parseMt940(content)

    if (!parsed.iban) {
      error.value = 'Kon geen rekeningnummer vinden in dit bestand — is het een geldig MT940/.sta-bestand?'
      fileName.value = null
      return
    }

    iban.value = maskIban(parsed.iban)
    dateRange.value = formatDateRange(parsed.transactions.map((t) => t.bookedAt))
    summary.value = await importStatement(parsed)
    await refreshNakijkenCount()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Onbekende fout bij het lezen van het bestand.'
    fileName.value = null
  }
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void handleFile(file)
}

function onFileInputChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void handleFile(file)
}

function openFilePicker() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="import-screen">
    <div
      class="dropzone"
      :class="{ 'dropzone--active': isDragging }"
      role="button"
      tabindex="0"
      @click="openFilePicker"
      @keydown.enter="openFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" accept=".sta,.940,.txt" class="visually-hidden" @change="onFileInputChange" />
      <div class="dropzone-glyph">↧</div>
      <p class="dropzone-title">Kies je .sta-bestand</p>
      <p class="dropzone-sub">of sleep het hierheen</p>

      <p v-if="fileName && !error" class="read-line">
        {{ fileName }} gelezen ✓ / {{ summary?.found ?? 0 }} regels
        <template v-if="dateRange"> · {{ dateRange }}</template>
        <template v-if="iban"> · {{ iban }}</template>
      </p>
      <p v-if="error" class="error-line">{{ error }}</p>
    </div>

    <div v-if="summary" class="result-panel">
      <ul class="result-list">
        <li>
          <span>Regels gevonden</span>
          <strong>{{ summary.found }}</strong>
        </li>
        <li class="result-neutral">
          <span>Al bekend (dubbel)</span>
          <strong>{{ summary.duplicates }}</strong>
        </li>
        <li class="result-ink">
          <span>Automatisch in een potje</span>
          <strong>{{ summary.automatic }}</strong>
        </li>
        <li class="result-accent">
          <span>Naar nakijken</span>
          <strong>{{ summary.toReview }}</strong>
        </li>
      </ul>

      <NuxtLink
        v-if="summary.automatic + summary.toReview > 0"
        to="/nakijken"
        class="confirm-button"
      >
        {{ summary.automatic }} toevoegen · {{ summary.toReview }} nakijken
      </NuxtLink>

      <p class="footnote">Bestand blijft op je apparaat. Dubbelen worden herkend op volgnummer.</p>
    </div>
  </div>
</template>

<style scoped>
.import-screen {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 640px;
}

.dropzone {
  border: 2px dashed var(--color-accent);
  border-radius: var(--radius-panel-lg);
  padding: 52px 24px;
  text-align: center;
  cursor: pointer;
  background: var(--card);
}

.dropzone:hover,
.dropzone--active {
  background: var(--color-accent-100);
}

.dropzone-glyph {
  font-size: 28px;
  color: var(--color-accent);
  margin-bottom: 8px;
}

.dropzone-title {
  font-family: var(--font-heading);
  font-size: 17px;
  margin: 0 0 4px;
}

.dropzone-sub {
  font-size: 13px;
  color: var(--color-neutral-600);
  margin: 0;
}

.read-line {
  margin-top: 16px;
  font-size: 13.5px;
  color: var(--ink-deep);
}

.error-line {
  margin-top: 16px;
  font-size: 13.5px;
  color: var(--color-accent-700);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.result-list li {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.result-ink strong {
  color: var(--ink);
}

.result-accent strong {
  color: var(--color-accent-700);
}

.result-neutral strong {
  color: var(--color-neutral-600);
}

.confirm-button {
  display: block;
  text-align: center;
  padding: 14px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 14px;
  text-decoration: none;
}

.confirm-button:hover {
  background: var(--ink-deep);
}

.footnote {
  font-size: 12px;
  color: var(--color-neutral-600);
  text-align: center;
  margin: 0;
}
</style>
