export interface ScreenHeaderBack {
  to: string
  label: string
}

const title = ref('')
const subtitle = ref('')
const back = ref<ScreenHeaderBack | undefined>(undefined)
const hideOnMobile = ref(false)

/** Lets each page set the header's title/subtitle pair (see README "Each screen supplies its own title/subtitle pair"). */
export function useScreenHeader() {
  function set(
    nextTitle: string,
    nextSubtitle: string,
    opts?: { back?: ScreenHeaderBack; hideOnMobile?: boolean },
  ) {
    title.value = nextTitle
    subtitle.value = nextSubtitle
    back.value = opts?.back
    hideOnMobile.value = opts?.hideOnMobile ?? false
  }

  return {
    title: readonly(title),
    subtitle: readonly(subtitle),
    back: readonly(back),
    hideOnMobile: readonly(hideOnMobile),
    set,
  }
}
