import { computed, ref } from 'vue'
import { type useUiTreeStore } from '../../modules/ui-builder/entities/ui-node'

/** Focus mode hides every panel, the toolbar and the page tabs so only the canvas is left. */
export function useFocusMode(store: ReturnType<typeof useUiTreeStore>, modifierKey: string) {
  const focusMode = ref(false)
  /** Panels, toolbar and tabs show only while editing normally. */
  const showChrome = computed(() => !store.isPreviewMode && !focusMode.value)
  const toggleFocus = () => {
    focusMode.value = !focusMode.value
    if (focusMode.value) store.setNotice(`Focus mode. Press Esc or ${modifierKey} \\ to bring the panels back.`)
  }
  return { focusMode, showChrome, toggleFocus }
}

/** ⌘ on macOS, Ctrl elsewhere. */
export const platformModifierKey = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
