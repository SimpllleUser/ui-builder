import { nextTick, watch, type Ref } from 'vue'

/**
 * Keeps where a scrolling panel was for each of its tabs: going from Style to Behavior and back lands on the same spot
 * in Style. Choosing another element starts every tab from the top again.
 */
export function useTabScroll<Tab>(
  container: Ref<{ scrollTop: number } | undefined>,
  tab: Ref<Tab>,
  element: Ref<unknown>,
) {
  const remembered = new Map<Tab, number>()
  // Declared first so that, when an element change also changes the tab, the tab starts from the top.
  watch(element, () => {
    remembered.clear()
    if (container.value) container.value.scrollTop = 0
  })
  watch(tab, async (next, previous) => {
    const panel = container.value
    if (!panel) return
    remembered.set(previous, panel.scrollTop)
    await nextTick()
    panel.scrollTop = remembered.get(next) ?? 0
  })
}
