import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { cloneNode } from './nodeUtils'
import { runAction, type BoundAction } from './actions'
import type { Page, Project, UiAction } from './types'

interface PreviewRuntimeSources {
  project: Ref<Project>
  activePage: ComputedRef<Page>
  isPreviewMode: Ref<boolean>
  setNotice(message: string): void
}

/** State and navigation of the running preview. Each preview starts from the project's initial state. */
export function usePreviewRuntime({ project, activePage, isPreviewMode, setNotice }: PreviewRuntimeSources) {
  const state = ref<Record<string, unknown>>({})
  const pageId = ref('')
  const page = computed(() => project.value.pages.find(item => item.id === pageId.value) ?? activePage.value)
  /** The layout when one exists (its outlet shows the page), otherwise the page itself. */
  const root = computed(() => project.value.layout ?? page.value.root)

  const navigate = (path: string) => {
    const wanted = path.trim().replace(/(.)\/+$/, '$1')
    const target = project.value.pages.find(item => item.path === wanted)
    if (target) pageId.value = target.id
    else setNotice(`No page with path ${wanted || '(empty)'}.`)
  }
  const dispatch = (action: UiAction | BoundAction | undefined) =>
    runAction(action, {
      get state() {
        return state.value
      },
      navigate,
    })

  // A preview starts on the page being edited, with every variable at its starting value.
  let startPageId = ''
  const start = () => {
    startPageId = activePage.value.id
    reset()
  }
  /** Back to how the preview began: starting values and the page it opened on. */
  const reset = () => {
    state.value = cloneNode(project.value.state)
    pageId.value = project.value.pages.some(item => item.id === startPageId) ? startPageId : activePage.value.id
  }
  watch(isPreviewMode, on => {
    if (on) start()
  })

  return { state, pageId, page, root, navigate, dispatch, reset, start }
}
