<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useScreenHeader } from '../composables/useScreenHeader'
import { useGezinsleden } from '../composables/useGezinsleden'
import { useReauthGuard } from '../composables/useReauthGuard'
import { useSecurityCheckStatus } from '../composables/useSecurityCheckStatus'
import { AVATAR_KLEUREN, initiaal } from '../lib/domain/gezinslid'
import { createGezinslid, removeGezinslid, updateGezinslid } from '../lib/db/gezinsleden'
import { changePin } from '../lib/crypto/keyring'
import { disableBiometric, hasBiometric, isPlatformAuthenticatorAvailable, setupBiometric } from '../lib/crypto/webauthn'
import { getDekOnceUnlocked } from '../lib/crypto/session'
import type { Gezinslid } from '../lib/domain/types'

const screenHeader = useScreenHeader()
screenHeader.set('Account', 'Beveiliging en gezinsleden', { back: { to: '/nu', label: 'Nu' } })

const { gezinsleden, refresh } = useGezinsleden()
const { requireReauth } = useReauthGuard()
const { status: securityStatus } = useSecurityCheckStatus()

onMounted(refresh)

const lastCheckedLabel = computed(() => {
  if (!securityStatus.value) return null
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(securityStatus.value.timestamp),
  )
})

// --- Beveiliging: pincode wijzigen ---
const showPinForm = ref(false)
const newPin = ref('')
const confirmNewPin = ref('')
const pinError = ref<string | null>(null)
const pinBusy = ref(false)

function validPin(value: string): boolean {
  return /^\d{4,8}$/.test(value)
}

async function startChangePin() {
  if (!(await requireReauth('Pincode wijzigen'))) return
  showPinForm.value = true
}

async function submitChangePin() {
  pinError.value = null
  if (!validPin(newPin.value)) {
    pinError.value = 'Kies een pincode van 4 tot 8 cijfers.'
    return
  }
  if (newPin.value !== confirmNewPin.value) {
    pinError.value = 'De pincodes komen niet overeen.'
    return
  }
  pinBusy.value = true
  try {
    const dek = await getDekOnceUnlocked()
    await changePin(dek, newPin.value)
    showPinForm.value = false
    newPin.value = ''
    confirmNewPin.value = ''
  } finally {
    pinBusy.value = false
  }
}

// --- Beveiliging: biometrie aan/uit ---
const biometricEnabled = ref(false)
const biometricAvailable = ref(false)
const biometricBusy = ref(false)
const biometricError = ref<string | null>(null)

onMounted(async () => {
  biometricEnabled.value = await hasBiometric()
  biometricAvailable.value = await isPlatformAuthenticatorAvailable()
})

async function toggleBiometric() {
  biometricError.value = null
  const reason = biometricEnabled.value ? 'Biometrie uitschakelen' : 'Biometrie inschakelen'
  if (!(await requireReauth(reason))) return

  biometricBusy.value = true
  try {
    if (biometricEnabled.value) {
      await disableBiometric()
      biometricEnabled.value = false
    } else {
      const dek = await getDekOnceUnlocked()
      if (!(await setupBiometric(dek))) {
        biometricError.value = 'Kon niet worden ingeschakeld op dit toestel.'
      }
      biometricEnabled.value = await hasBiometric()
    }
  } finally {
    biometricBusy.value = false
  }
}

// --- Gezinsleden ---
const editingId = ref<string | null>(null)
const editNaam = ref('')
const editKleur = ref<string>(AVATAR_KLEUREN[0])
const showCreateForm = ref(false)
const newNaam = ref('')
const newKleur = ref<string>(AVATAR_KLEUREN[0])

function startEdit(gezinslid: Gezinslid) {
  editingId.value = gezinslid.id
  editNaam.value = gezinslid.naam
  editKleur.value = gezinslid.avatarKleur
}

async function submitEdit() {
  if (!editingId.value || !editNaam.value.trim()) return
  await updateGezinslid(editingId.value, editNaam.value.trim(), editKleur.value)
  editingId.value = null
  await refresh()
}

async function submitCreateGezinslid() {
  if (!newNaam.value.trim()) return
  await createGezinslid(newNaam.value.trim(), newKleur.value)
  newNaam.value = ''
  showCreateForm.value = false
  await refresh()
}

async function deleteGezinslid(id: string) {
  await removeGezinslid(id)
  await refresh()
}
</script>

<template>
  <div class="account-screen">
    <section class="panel">
      <h2 class="panel-title">Beveiliging</h2>
      <p class="status-line">
        <span class="status-dot" :class="{ 'status-dot--warn': securityStatus?.verified === false }" />
        <span v-if="securityStatus === null">Nog niet gecontroleerd</span>
        <span v-else-if="securityStatus.verified">Geverifieerd</span>
        <span v-else>Beveiligingsstatus kon niet worden geverifieerd</span>
        <span v-if="lastCheckedLabel" class="status-sub"> · laatste controle {{ lastCheckedLabel }}</span>
      </p>

      <div class="row">
        <div>
          <div class="row-label">Pincode</div>
          <div class="row-sub">Wijzig de pincode waarmee je dit toestel ontgrendelt.</div>
        </div>
        <button type="button" class="ghost-button" @click="startChangePin">Wijzigen</button>
      </div>

      <form v-if="showPinForm" class="pin-form" novalidate @submit.prevent="submitChangePin">
        <input
          v-model="newPin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="Nieuwe pincode (4-8 cijfers)"
          class="input"
          autocomplete="new-password"
        />
        <input
          v-model="confirmNewPin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]*"
          placeholder="Herhaal nieuwe pincode"
          class="input"
          autocomplete="new-password"
        />
        <p v-if="pinError" class="error-line">{{ pinError }}</p>
        <div class="create-actions">
          <button type="submit" class="primary-button" :disabled="pinBusy">Opslaan</button>
          <button type="button" class="ghost-button" @click="showPinForm = false">Annuleren</button>
        </div>
      </form>

      <div class="row">
        <div>
          <div class="row-label">Biometrie</div>
          <div class="row-sub">
            <template v-if="biometricEnabled"
              >Vingerafdruk of gezicht is ingeschakeld als aanvulling op je pincode.</template
            >
            <template v-else-if="biometricAvailable">Optioneel, naast je pincode — die blijft altijd werken.</template>
            <template v-else>Dit toestel ondersteunt geen biometrisch ontgrendelen.</template>
          </div>
        </div>
        <button
          v-if="biometricAvailable || biometricEnabled"
          type="button"
          class="ghost-button"
          :disabled="biometricBusy"
          @click="toggleBiometric"
        >
          {{ biometricEnabled ? 'Uitschakelen' : 'Inschakelen' }}
        </button>
      </div>
      <p v-if="biometricError" class="error-line">{{ biometricError }}</p>
    </section>

    <section class="panel">
      <h2 class="panel-title">Gezinsleden</h2>
      <p class="panel-sub">Puur herkenbaarheid — geen rechten, iedereen kan alles.</p>

      <ul class="gezinsleden-list">
        <li v-for="g in gezinsleden" :key="g.id" class="gezinslid-row">
          <form v-if="editingId === g.id" class="edit-form" @submit.prevent="submitEdit">
            <input v-model="editNaam" type="text" class="input" required />
            <div class="kleuren">
              <button
                v-for="kleur in AVATAR_KLEUREN"
                :key="kleur"
                type="button"
                class="kleur-swatch"
                :class="{ 'kleur-swatch--actief': kleur === editKleur }"
                :style="{ background: `var(--color-${kleur})` }"
                :aria-label="kleur"
                @click="editKleur = kleur"
              />
            </div>
            <div class="create-actions">
              <button type="submit" class="primary-button">Opslaan</button>
              <button type="button" class="ghost-button" @click="editingId = null">Annuleren</button>
            </div>
          </form>
          <template v-else>
            <span class="avatar" :style="{ background: `var(--color-${g.avatarKleur})` }">{{ initiaal(g.naam) }}</span>
            <span class="naam">{{ g.naam }}</span>
            <button type="button" class="text-button" @click="startEdit(g)">Bewerken</button>
            <button type="button" class="text-button" @click="deleteGezinslid(g.id)">Verwijderen</button>
          </template>
        </li>
      </ul>

      <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
        + Nieuw gezinslid
      </button>
      <form v-else class="create-form" @submit.prevent="submitCreateGezinslid">
        <input v-model="newNaam" type="text" placeholder="Naam" class="input" required />
        <div class="kleuren">
          <button
            v-for="kleur in AVATAR_KLEUREN"
            :key="kleur"
            type="button"
            class="kleur-swatch"
            :class="{ 'kleur-swatch--actief': kleur === newKleur }"
            :style="{ background: `var(--color-${kleur})` }"
            :aria-label="kleur"
            @click="newKleur = kleur"
          />
        </div>
        <div class="create-actions">
          <button type="submit" class="primary-button">Toevoegen</button>
          <button type="button" class="ghost-button" @click="showCreateForm = false">Annuleren</button>
        </div>
      </form>
    </section>

    <section class="panel panel--muted">
      <h2 class="panel-title">Synchronisatie</h2>
      <p class="panel-sub">
        Nog niet beschikbaar in de app. Versleutelde sync tussen apparaten (ADR 0004) bestaat nu alleen als
        relay-scaffold — er is nog geen sync-cliënt in de PWA. Komt later, samen met de nog openstaande beslissing
        over apparaat-intrekking versus wachtwoordrotatie.
      </p>
    </section>
  </div>
</template>

<style scoped>
.account-screen {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 640px;
}

.panel {
  background: var(--card);
  border-radius: 30px;
  box-shadow: var(--shadow-sm);
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel--muted {
  background: var(--soft);
  box-shadow: none;
}

.panel-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--ink-deep);
}

.panel-sub {
  margin: -10px 0 0;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -6px 0 0;
  font-size: 13.5px;
  color: var(--ink-deep);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--color-accent-2-400, #4a9);
  flex: none;
}

.status-dot--warn {
  background: var(--color-accent-700);
}

.status-sub {
  color: var(--color-neutral-700);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.row-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-deep);
}

.row-sub {
  font-size: 12.5px;
  color: var(--color-neutral-700);
  margin-top: 2px;
}

.gezinsleden-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gezinslid-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.avatar {
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 999px;
  border: 1.5px solid var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.naam {
  flex: 1;
  font-weight: 600;
}

.text-button {
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  padding: 4px;
}

.ghost-button {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-family: var(--font-heading);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
}

.pin-form,
.create-form,
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input {
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-neutral-300);
  font-size: 14px;
}

.kleuren {
  display: flex;
  gap: 8px;
}

.kleur-swatch {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  cursor: pointer;
}

.kleur-swatch--actief {
  border-color: var(--color-text);
}

.create-actions {
  display: flex;
  gap: 10px;
}

.primary-button {
  border: none;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-heading);
  font-size: 14px;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-line {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-accent-700);
}
</style>
