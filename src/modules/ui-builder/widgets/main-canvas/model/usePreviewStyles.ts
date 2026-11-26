import { computed } from 'vue'
import { responsiveStylesheet, styleClassSheet, useUiTreeStore } from '../../../entities/ui-node'

/**
 * The rules the shown elements need: the shared style classes always, and in Preview also the media queries of
 * elements that differ per screen size (the canvas puts those inline, for the size being edited).
 */
export function usePreviewStyles() {
  const store = useUiTreeStore()
  return computed(() => {
    const shared = styleClassSheet(store.project.styleClasses)
    if (!store.isPreviewMode) return shared
    const responsive = responsiveStylesheet([
      ...store.pages.map(page => page.root),
      ...(store.project.layout ? [store.project.layout] : []),
      store.previewRoot,
    ])
    return [shared, responsive].filter(Boolean).join('\n')
  })
}
