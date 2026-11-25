import { computed } from 'vue'
import { effectiveStyle, useUiTreeStore, type UiNode } from '../../../entities/ui-node'
import { cleanStyle, type StyleMap } from '../../../../../shared/lib/inlineStyle'

/** Reads and changes the style of an element, so each design control only deals with its own properties. */
export function useNodeStyle(node: () => UiNode) {
  const store = useUiTreeStore()
  // What the element looks like on the screen size being edited; the saved values keep their `!important` markers.
  const style = computed<StyleMap>(() => cleanStyle(effectiveStyle(node(), store.editingBreakpoint)))
  const apply = (patch: Record<string, string | null>) => store.updateNodeStyle(node().id, patch)
  return { style, apply }
}
