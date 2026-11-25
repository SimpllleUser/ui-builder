import { onBeforeUnmount, onMounted } from 'vue'
import { hasOpenOverlay, isInTextField } from '../../../../../shared/lib/dom'
import type { useUiTreeStore } from '../../../entities/ui-node'

const CLIPBOARD_FORMAT = 'text/plain'

/**
 * Ctrl/⌘ C and V for elements. It listens to the browser's own copy and paste events, which need no permission and
 * carry the elements between pages, projects and tabs. Text fields and selected text keep their usual behavior.
 */
export function useClipboardShortcuts(store: ReturnType<typeof useUiTreeStore>) {
  const isForElements = (event: ClipboardEvent) =>
    !store.isPreviewMode && !hasOpenOverlay() && !isInTextField(event.target)

  const onCopy = (event: ClipboardEvent) => {
    if (!isForElements(event) || window.getSelection()?.toString()) return
    const text = store.copySelection()
    if (!text || !event.clipboardData) return
    event.clipboardData.setData(CLIPBOARD_FORMAT, text)
    event.preventDefault()
  }
  const onPaste = (event: ClipboardEvent) => {
    if (!isForElements(event)) return
    const text = event.clipboardData?.getData(CLIPBOARD_FORMAT)
    if (text && store.pasteElements(text)) event.preventDefault()
  }

  onMounted(() => {
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('copy', onCopy)
    document.removeEventListener('paste', onPaste)
  })
}
