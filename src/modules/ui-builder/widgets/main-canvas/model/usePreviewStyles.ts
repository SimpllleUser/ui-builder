import { computed } from 'vue'
import { responsiveStylesheet, useUiTreeStore } from '../../../entities/ui-node'

/** Preview has a real width, so elements that differ per screen size need their media queries in the page. */
export function usePreviewStyles() {
  const store = useUiTreeStore()
  return computed(() =>
    store.isPreviewMode
      ? responsiveStylesheet([
          ...store.pages.map(page => page.root),
          ...(store.project.layout ? [store.project.layout] : []),
          store.previewRoot,
        ])
      : '',
  )
}
