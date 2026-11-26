import { computed } from 'vue'
import { effectiveStyle, sharedStyleOf, useUiTreeStore, type UiNode } from '../../../entities/ui-node'

/** The two kinds of style that win over Vuetify's classes, on the screen size being edited. */
export function useOverriddenStyles(node: () => UiNode) {
  const store = useUiTreeStore()
  return {
    ownStyle: computed(() => effectiveStyle(node(), store.editingBreakpoint)),
    sharedStyle: computed(() => sharedStyleOf(node(), store.project.styleClasses ?? {})),
  }
}
