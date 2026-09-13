<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createGezinslid } from '../lib/db/gezinsleden'
import { AVATAR_KLEUREN, initiaal } from '../lib/domain/gezinslid'
import { useActiveGezinslid } from '../composables/useActiveGezinslid'
import { useGezinsleden } from '../composables/useGezinsleden'

const { actiefGezinslidId, kies } = useActiveGezinslid()
const { gezinsleden, loaded, refresh } = useGezinsleden()

const showCreateForm = ref(false)
const newNaam = ref('')
const newKleur = ref<string>(AVATAR_KLEUREN[0])

onMounted(refresh)

// Show once loaded, and either no profile chosen yet on this device, or the
// chosen id no longer exists (e.g. local data was cleared).
const visible = computed(
  () => loaded.value && !gezinsleden.value.some((g) => g.id === actiefGezinslidId.value),
)

function kiesGezinslid(id: string) {
  kies(id)
}

async function submitCreate() {
  if (!newNaam.value.trim()) return
  const gezinslid = await createGezinslid(newNaam.value.trim(), newKleur.value)
  newNaam.value = ''
  showCreateForm.value = false
  await refresh()
  kies(gezinslid.id)
}
</script>

<template>
  <div v-if="visible" class="overlay">
    <div class="dialog">
      <h2 class="title">Wie ben jij?</h2>
      <p class="sub">Dit kies je per apparaat — het beschermt niets, het is alleen voor jezelf herkenbaar.</p>

      <div v-if="gezinsleden.length > 0" class="profiles">
        <button
          v-for="g in gezinsleden"
          :key="g.id"
          type="button"
          class="profile"
          @click="kiesGezinslid(g.id)"
        >
          <span class="avatar" :style="{ background: `var(--color-${g.avatarKleur})` }">{{
            initiaal(g.naam)
          }}</span>
          <span class="naam">{{ g.naam }}</span>
        </button>
      </div>

      <button v-if="!showCreateForm" type="button" class="ghost-button" @click="showCreateForm = true">
        + Nieuw gezinslid
      </button>
      <form v-else class="create-form" @submit.prevent="submitCreate">
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
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--ink-deep) 55%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog {
  background: var(--card);
  border-radius: var(--radius-panel-lg);
  box-shadow: var(--shadow-lg);
  padding: 32px;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--ink-deep);
}

.sub {
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--color-neutral-700);
}

.profiles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: none;
  border-radius: 999px;
  background: var(--soft);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
  text-align: left;
}

.profile:hover {
  background: var(--soft-pressed);
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
  font-weight: 600;
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

.create-form {
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
</style>
