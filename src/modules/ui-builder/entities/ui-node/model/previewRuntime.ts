import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue'
import { cloneNode } from './nodeUtils'
import { bindAction, runAction } from './actions'
import { createRuntimeState } from './computedVariables'
import { emptyLike } from './dataSources'
import { formVariables } from './forms'
import type { Scope } from './runtime'
import type { Page, Project, UiAction, UiNode } from './types'

/** Stops a chain where appearing elements make more elements appear for ever. */
const MAX_APPEAR_RUNS = 200

interface PreviewRuntimeSources {
  project: Ref<Project>
  activePage: ComputedRef<Page>
  isPreviewMode: Ref<boolean>
  setNotice(message: string): void
}

/** Where the actions of an event happen. */
export interface ActionContext {
  /** Names that exist only there, such as `item` or `value`. */
  scope?: Scope
  /** The form the element is in. */
  form?: UiNode | null
  /** Called after the form's variables were reset. */
  onFormReset?: () => void
}

export interface PreviewMessage {
  text: string
  /** Counts up, so the same text shows again. */
  serial: number
}

/** State and navigation of the running preview. Each preview starts from the project's initial state. */
export function usePreviewRuntime({ project, activePage, isPreviewMode, setNotice }: PreviewRuntimeSources) {
  const state = ref<Record<string, unknown>>({})
  const pageId = ref('')
  const message = ref<PreviewMessage | null>(null)
  /** Changes on every start and reset, so the page is drawn anew and its elements appear again. */
  const run = ref(0)
  const page = computed(() => project.value.pages.find(item => item.id === pageId.value) ?? activePage.value)
  /** The layout when one exists (its outlet shows the page), otherwise the page itself. */
  const root = computed(() => project.value.layout ?? page.value.root)

  const navigate = (path: string) => {
    const wanted = path.trim().replace(/(.)\/+$/, '$1')
    const target = project.value.pages.find(item => item.path === wanted)
    if (target) pageId.value = target.id
    else setNotice(`No page with path ${wanted || '(empty)'}.`)
  }
  const notify = (text: string) => {
    message.value = { text, serial: (message.value?.serial ?? 0) + 1 }
  }
  const resetForm = ({ form, onFormReset }: ActionContext) => {
    if (!form) return
    for (const name of formVariables(form))
      state.value[name] = name in project.value.state ? cloneNode(project.value.state[name]) : ''
    onFormReset?.()
  }
  /** Runs the actions in order. Each one sees what those before it changed. */
  const runActions = (actions: UiAction[], context: ActionContext = {}) => {
    for (const action of actions) {
      runAction(bindAction(action, { ...state.value, ...context.scope }), {
        get state() {
          return state.value
        },
        navigate,
        notify,
        resetForm: () => resetForm(context),
      })
    }
  }

  let appearRuns = 0
  /** Actions of elements appearing, with a limit against elements that keep each other appearing. */
  const runAppearActions = (actions: UiAction[], context: ActionContext = {}) => {
    appearRuns++
    if (appearRuns <= MAX_APPEAR_RUNS) runActions(actions, context)
    else if (appearRuns === MAX_APPEAR_RUNS + 1)
      setNotice('“When it appears” actions keep running, so Preview stopped them.')
  }

  let timers: Array<ReturnType<typeof setTimeout>> = []
  const stopLoading = () => {
    timers.forEach(clearTimeout)
    timers = []
  }
  /** Pretends to fetch each data source: empty at first, then the starting value arrives. No request is sent. */
  const loadSources = () => {
    const sources = Object.entries(project.value.sources ?? {}).filter(([name]) => name in project.value.state)
    const waiting = new Map<string, number>()
    for (const [name, { delayMs, loadingVariable }] of sources) {
      const data = cloneNode(project.value.state[name])
      state.value[name] = emptyLike(data)
      if (loadingVariable) {
        waiting.set(loadingVariable, (waiting.get(loadingVariable) ?? 0) + 1)
        state.value[loadingVariable] = true
      }
      timers.push(
        setTimeout(() => {
          state.value[name] = data
          if (!loadingVariable) return
          waiting.set(loadingVariable, waiting.get(loadingVariable)! - 1)
          state.value[loadingVariable] = waiting.get(loadingVariable)! > 0
        }, delayMs),
      )
    }
  }

  // A preview starts on the page being edited, with every variable at its starting value.
  let startPageId = ''
  const start = () => {
    startPageId = activePage.value.id
    reset()
  }
  /** Back to how the preview began: starting values and the page it opened on. */
  const reset = () => {
    stopLoading()
    appearRuns = 0
    message.value = null
    state.value = createRuntimeState(project.value.state, project.value.computed)
    loadSources()
    pageId.value = project.value.pages.some(item => item.id === startPageId) ? startPageId : activePage.value.id
    run.value++
  }
  watch(isPreviewMode, on => {
    if (on) start()
    else stopLoading()
  })
  onScopeDispose(stopLoading)

  return { state, pageId, page, root, message, run, navigate, runActions, runAppearActions, reset, start }
}
