import type { useUiTreeStore } from '../../../entities/ui-node'

type Store = ReturnType<typeof useUiTreeStore>

/** Copy from a menu or the search, where there is no copy event to put the text into. */
export async function copyToClipboard(store: Store) {
  const text = store.copySelection()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    store.setNotice('The browser did not allow copying. Press Ctrl/⌘ C instead.')
  }
}

/** Reading the clipboard from a menu asks the browser for permission; the keyboard shortcut does not. */
export async function pasteFromClipboard(store: Store) {
  let text: string
  try {
    text = await navigator.clipboard.readText()
  } catch {
    store.setNotice('The browser did not allow reading the clipboard. Press Ctrl/⌘ V instead.')
    return
  }
  if (!store.pasteElements(text) && !text) store.setNotice('There are no copied elements to paste.')
}
