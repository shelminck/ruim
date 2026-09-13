export interface ScreenHeaderBack {
  to: string
  label: string
}

const title = ref('')
const subtitle = ref('')
const back = ref<ScreenHeaderBack | undefined>(undefined)
const avatars = ref(false)

/** Lets each page set the header's title/subtitle pair (see design handoff, the `KOP` table keyed by screen). */
export function useScreenHeader() {
  function set(nextTitle: string, nextSubtitle: string, opts?: { back?: ScreenHeaderBack; avatars?: boolean }) {
    title.value = nextTitle
    subtitle.value = nextSubtitle
    back.value = opts?.back
    avatars.value = opts?.avatars ?? false
  }

  return {
    title: readonly(title),
    subtitle: readonly(subtitle),
    back: readonly(back),
    avatars: readonly(avatars),
    set,
  }
}
