const title = ref('')
const subtitle = ref('')

/** Lets each page set the header's title/subtitle pair (see README "Each screen supplies its own title/subtitle pair"). */
export function useScreenHeader() {
  function set(nextTitle: string, nextSubtitle: string) {
    title.value = nextTitle
    subtitle.value = nextSubtitle
  }

  return { title: readonly(title), subtitle: readonly(subtitle), set }
}
