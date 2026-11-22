import { computed } from 'vue'
import { useUiTreeStore, type UiNode } from '../../../entities/ui-node'
import { cleanStyle, markImportant, readStyle, withStyle, type StyleMap } from '../../../../../shared/lib/inlineStyle'

/** Reads and changes the inline style of an element, so each design control only deals with its own properties. */
export function useNodeStyle(node: () => UiNode) {
  const store = useUiTreeStore()
  // The saved style keeps the `!important` markers; the controls see the plain values.
  const saved = computed<StyleMap>(() => readStyle(node().props.style))
  const style = computed<StyleMap>(() => cleanStyle(saved.value))

  const apply = (patch: Record<string, string | null>) => {
    const important = Object.fromEntries(
      Object.entries(patch).map(([name, value]) => [name, value && markImportant(value)]),
    )
    const next = withStyle(saved.value, important)
    store.updateNodeProp(node().id, 'style', Object.keys(next).length ? next : undefined)
  }
  return { style, apply }
}
