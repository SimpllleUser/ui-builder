import { computed, type ComputedRef, type Ref } from 'vue'
import { createRuntimeState } from './computedVariables'
import { OUTLET_NODE_TYPE } from './constants'
import { EventName } from './enums'
import { actionsOf } from './events'
import { enclosingForm, formErrors, isForm, isSubmitButton, submitActions } from './forms'
import { applyPrefabProps } from './prefabProps'
import { previewReach } from './previewReach'
import { usePreviewRuntime } from './previewRuntime'
import { snapshotPreview } from './previewSnapshot'
import type { Scope } from './runtime'
import { resolveTableData } from './tableBindings'
import { findNodeById, findPath, walkNodes } from './treeUtils'
import type { Page, Prefab, Project, UiAction, UiNode } from './types'

interface PreviewSources {
  project: Ref<Project>
  activePage: ComputedRef<Page>
  editingPrefab: ComputedRef<Prefab | null>
  isPreviewMode: Ref<boolean>
  setNotice(message: string): void
}

/** Preview of what is being edited, and what a person can do in it: the editor draws it, agents drive it. */
export function usePreviewSession({ project, activePage, editingPrefab, isPreviewMode, setNotice }: PreviewSources) {
  const preview = usePreviewRuntime({ project, activePage, isPreviewMode, setNotice })
  /** Starts Preview at once, so what follows already sees the starting values. */
  const startPreview = () => {
    isPreviewMode.value = true
    preview.start()
  }
  /** What Preview draws: a component being edited with its default parameters, otherwise the layout or the page. */
  const previewRoot = computed(() =>
    editingPrefab.value
      ? applyPrefabProps(editingPrefab.value.node, editingPrefab.value.props ?? [])
      : preview.root.value,
  )
  // Preview draws the page and, around it, the shared layout; a click can land on either.
  const previewTrees = computed(() =>
    editingPrefab.value
      ? [previewRoot.value]
      : [preview.page.value.root, ...(project.value.layout ? [project.value.layout] : [])],
  )
  /** The elements around one of Preview, from the top of what is drawn; a page sits where the layout puts it. */
  const pathInPreview = (id: string): UiNode[] | null => {
    for (const root of previewTrees.value) {
      const path = findPath(id, root)
      if (!path) continue
      const layout = project.value.layout
      if (!layout || editingPrefab.value || root === layout) return path
      const outlet = [...walkNodes(layout)].find(node => node.type === OUTLET_NODE_TYPE)
      return [...((outlet && findPath(outlet.id, layout)) ?? []), ...path]
    }
    return null
  }
  /**
   * The element of Preview with the form it is in and the names of the copy meant. Throws when a person could not
   * use it now, or when it is shown several times and `copy` (0-based, as shown) does not say which one.
   */
  const needInPreview = (id: string, copy?: number) => {
    if (!isPreviewMode.value) throw new Error('Preview is not running. Start it first.')
    const path = pathInPreview(id)
    if (!path) throw new Error(`Node not found on the preview page: ${id}`)
    const { copies, obstacle } = previewReach(path, preview.state.value)
    if (obstacle) throw new Error(obstacle)
    const node = path[path.length - 1]
    if (copy === undefined && copies.length > 1)
      throw new Error(
        `“${node.name}” is shown ${copies.length} times: say which with copy (0 to ${copies.length - 1}).`,
      )
    const scope = copies[copy ?? 0]
    if (!scope) throw new Error(`“${node.name}” has no copy ${copy}: it is shown ${copies.length} time(s).`)
    const root = previewTrees.value.find(tree => findNodeById(id, tree))!
    return { node, form: enclosingForm(root, id), scope }
  }
  /** Submits a form as a person would: its actions run only when every rule is satisfied. */
  const submitForm = (form: UiNode, scope: Scope = {}) => {
    const errors = formErrors(form, preview.state.value)
    if (!errors.length) preview.runActions(submitActions(form), { form, scope })
    return errors
  }
  /** Clicks an element in Preview as a person would. For a table row, `row` says which one was clicked. */
  const previewClick = (id: string, row?: number, copy?: number) => {
    const { node, form, scope } = needInPreview(id, copy)
    const actions = actionsOf(node.events, EventName.Click)
    const submits = !!form && isSubmitButton(node)
    if (!actions.length && !submits) throw new Error(`“${node.name}” has no click action.`)
    const data = { ...node.props, ...resolveTableData(node.props, preview.state.value) }
    const item = row === undefined ? undefined : (Array.isArray(data.items) ? data.items : [])[row]
    if (row !== undefined && item === undefined) throw new Error(`The table has no row ${row}.`)
    preview.runActions(actions, { form, scope: row === undefined ? scope : { ...scope, item, index: row } })
    return submits ? submitForm(form, scope) : []
  }
  /** Types into an input in Preview: sets the variable the input is linked to, then runs its change actions. */
  const previewInput = (id: string, value: unknown, copy?: number) => {
    const { node, form, scope } = needInPreview(id, copy)
    const actions = actionsOf(node.events, EventName.Change)
    if (!node.model && !actions.length) throw new Error('That element is not linked to a variable.')
    if (node.model) preview.state.value[node.model] = value
    preview.runActions(actions, { form, scope: { ...scope, value } })
  }
  const previewSubmit = (id: string, copy?: number) => {
    const { node, scope } = needInPreview(id, copy)
    if (!isForm(node)) throw new Error(`“${node.name}” is not a form.`)
    return submitForm(node, scope)
  }
  const describePreview = () =>
    snapshotPreview(
      project.value,
      editingPrefab.value ? { ...preview.page.value, root: previewRoot.value } : preview.page.value,
      preview.state.value,
      preview.message.value?.text,
    )
  /** What the canvas draws bindings with: every variable at its starting value, computed ones worked out. */
  const startingState = computed(() => createRuntimeState(project.value.state, project.value.computed))

  return {
    resetPreview: preview.reset,
    startPreview,
    previewClick,
    previewInput,
    previewSubmit,
    startingState,
    describePreview,
    runtimeState: preview.state,
    previewPageId: preview.pageId,
    previewPage: preview.page,
    previewRoot,
    navigate: preview.navigate,
    previewMessage: preview.message,
    previewRun: preview.run,
    runActions: preview.runActions,
    runAppearActions: preview.runAppearActions,
    dispatchAction: (action: UiAction) => preview.runActions([action]),
  }
}
