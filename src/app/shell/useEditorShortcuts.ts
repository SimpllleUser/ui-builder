import { SaveState, StepDirection, type useUiTreeStore } from '../../modules/ui-builder/entities/ui-node'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

// Open menus and dialogs, but not messages and tooltips: those should not swallow Escape.
const OPEN_OVERLAY = '.v-overlay--active:not(.v-snackbar):not(.v-tooltip)'
const TEXT_FIELD = 'input, textarea, select, [contenteditable="true"], [role="textbox"]'

interface Shortcuts {
  store: ReturnType<typeof useUiTreeStore>
  paletteOpen: Ref<boolean>
  focusMode: Ref<boolean>
  narrow: Ref<boolean>
  toggleFocus(): void
  closePanels(): void
  /** Writes an unsaved change before the page is left or hidden. */
  flushSave(): void
}

/** Every keyboard shortcut of the editor, registered while the editor is on screen. */
export function useEditorShortcuts({
  store,
  paletteOpen,
  focusMode,
  narrow,
  toggleFocus,
  closePanels,
  flushSave,
}: Shortcuts) {
  const goToNeighbourPage = (direction: StepDirection) => {
    const index = store.pages.findIndex(page => page.id === store.activePage.id)
    const next = store.pages[index + direction]
    if (next) store.selectPage(next.id)
  }

  const onEscape = () => {
    if (paletteOpen.value || document.querySelector(OPEN_OVERLAY)) return
    if (store.isPreviewMode) store.isPreviewMode = false
    else if (focusMode.value) focusMode.value = false
    else if (narrow.value) closePanels()
  }

  const onKey = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    // These work from anywhere, also while typing in a field.
    if (mod && key === 'k' && !store.isPreviewMode) {
      e.preventDefault()
      paletteOpen.value = !paletteOpen.value
      return
    }
    if (mod && e.code === 'Backslash' && !store.isPreviewMode) {
      e.preventDefault()
      toggleFocus()
      return
    }
    if (e.key === 'Escape') return onEscape()

    // The rest would get in the way of typing, or make no sense in Preview.
    if (store.isPreviewMode || (e.target instanceof HTMLElement && e.target.closest(TEXT_FIELD))) return
    if (e.altKey && (e.code === 'BracketLeft' || e.code === 'BracketRight')) {
      e.preventDefault()
      goToNeighbourPage(e.code === 'BracketLeft' ? StepDirection.Back : StepDirection.Forward)
    } else if (mod && key === 'z' && !e.shiftKey) {
      e.preventDefault()
      store.undo()
    } else if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) {
      e.preventDefault()
      store.redo()
    }
  }

  // Writing takes a moment: ask before the page is closed while something is not written yet.
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    flushSave()
    if (store.saveState !== SaveState.Saved || store.hasUnsavedPrefabs) event.preventDefault()
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pagehide', flushSave)
    document.addEventListener('visibilitychange', flushSave)
  })
  onBeforeUnmount(() => {
    flushSave()
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pagehide', flushSave)
    document.removeEventListener('visibilitychange', flushSave)
  })
}
