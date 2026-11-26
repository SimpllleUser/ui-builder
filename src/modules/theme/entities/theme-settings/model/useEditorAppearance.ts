import { useStorage } from '@vueuse/core'
import { DEFAULT_EDITOR_APPEARANCE, sanitizeEditorAppearance, type EditorAppearance } from './editorAppearance'

const STORAGE_KEY = 'ui-builder-editor-appearance'

const appearance = useStorage<EditorAppearance>(STORAGE_KEY, DEFAULT_EDITOR_APPEARANCE, undefined, {
  mergeDefaults: false,
  serializer: {
    read: text => sanitizeEditorAppearance(JSON.parse(text)),
    write: value => JSON.stringify(value),
  },
})

export function useEditorAppearance() {
  const resetAppearance = () => {
    appearance.value = { ...DEFAULT_EDITOR_APPEARANCE }
  }
  return { appearance, resetAppearance }
}
