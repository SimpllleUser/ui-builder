import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef, getNodeSlots } from './componentDefinitions'
import {
  HISTORY_COMMIT_DELAY_MS,
  MAX_CHECKPOINTS,
  MAX_HISTORY_ENTRIES,
  MAX_RECENT_COMPONENTS,
  ROOT_NODE_ID,
  TEXT_NODE_TYPE,
} from './constants'
import { DOCUMENT_KEY, emptyProject, parseProject, serializeProject } from './document'
import { describeChange } from './historyLabels'
import { cloneNodeWithNewIds, createNodeId } from './nodeUtils'
import * as tableMutations from './tableMutations'
import { usePreviewRuntime } from './previewRuntime'
import { snapshotPreview } from './previewSnapshot'
import { resolveTableData } from './tableBindings'
import { bindAction } from './runtime'
import {
  addPage as addPageMutation,
  deletePage as deletePageMutation,
  duplicatePage as duplicatePageMutation,
  movePage as movePageMutation,
  editLayout as editLayoutMutation,
  removeLayout as removeLayoutMutation,
  removeStateVariable as removeStateVariableMutation,
  selectPage as selectPageMutation,
  setStateVariable as setStateVariableMutation,
  updatePage as updatePageMutation,
  type ProjectMutationContext,
} from './projectMutations'
import {
  findNodeById as findNodeByIdInTree,
  findParentAndIndex as findParentAndIndexInTree,
  getNodeList,
  type NodeLocation,
} from './treeUtils'
import { createHistory } from './history'
import {
  appendNode,
  updateNodeLogic as updateNodeLogicMutation,
  type NodeLogicPatch,
  canReorder as canReorderNode,
  deleteNode as deleteNodeMutation,
  duplicateNode as duplicateNodeMutation,
  moveNode as moveNodeMutation,
  reorderNode as reorderNodeMutation,
} from './nodeMutations'
import {
  areNodesSiblings as areNodesSiblingsMutation,
  getUnwrapReason,
  unwrapNode as unwrapNodeMutation,
  wrapNodes as wrapNodesMutation,
  type ContainerMutationContext,
} from './containerMutations'
import {
  deletePrefab as deletePrefabMutation,
  insertPrefab as insertPrefabMutation,
  savePrefab as savePrefabMutation,
  type PrefabMutationContext,
} from './prefabMutations'
import { addTemplate as addTemplateMutation, type TemplateContext } from './templateFactory'
import { SaveState, type StepDirection, type TemplateKind } from './enums'
import { applyPrefabProps, reconcilePrefabProps, type PrefabPropValues } from './prefabProps'
import type { HistoryCheckpoint, Project, UiNode, Prefab } from './types'

const ACTIVE_PAGE_KEY = 'ui-builder:active-page'

/** Reopening the editor returns to the page that was being edited. */
function restoreActivePageId(project: Project): string {
  try {
    const saved = typeof window === 'undefined' ? null : window.localStorage.getItem(ACTIVE_PAGE_KEY)
    if (saved && project.pages.some(page => page.id === saved)) return saved
  } catch {
    /* storage unavailable: start on the first page */
  }
  return project.pages[0].id
}

export const useUiTreeStore = defineStore('ui-tree', () => {
  const notice = ref('')
  /** Whether the message offers an Undo button, and a counter so the same message shows again. */
  const noticeUndo = ref(false)
  const noticeSerial = ref(0)
  const setNotice = (message: string, undoable = false) => {
    notice.value = message
    noticeUndo.value = undoable
    noticeSerial.value++
  }
  const saveState = ref<SaveState>(SaveState.Saved)
  let initial: Project = emptyProject()
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(DOCUMENT_KEY)
      if (saved) initial = parseProject(saved)
    } catch {
      setNotice('Could not restore this page. The saved copy has not been changed. Import a backup to recover it.')
      saveState.value = SaveState.Error
    }
  }
  const project = ref<Project>(initial)
  const activePageId = ref(restoreActivePageId(initial))
  const editingLayout = ref(false)
  watch(
    activePageId,
    id => {
      try {
        window.localStorage.setItem(ACTIVE_PAGE_KEY, id)
      } catch {
        /* not remembered: the editor starts on the first page next time */
      }
    },
    { flush: 'sync' },
  )
  const activePage = computed(
    () => project.value.pages.find(page => page.id === activePageId.value) ?? project.value.pages[0],
  )
  const prefabs = useStorage<Prefab[]>('ui-builder:prefabs', [])
  /** A saved component opened for editing in place of the page, or null while a page or the layout is edited. */
  const editingPrefabId = ref<string | null>(null)
  const editingPrefab = computed(() => prefabs.value.find(prefab => prefab.prefabId === editingPrefabId.value) ?? null)
  /** The tree being edited: a saved component, the shared layout or the active page. Every editing command works on it. */
  const rootNode = computed<UiNode>({
    get: () => editingPrefab.value?.node ?? ((editingLayout.value && project.value.layout) || activePage.value.root),
    set: value => {
      if (editingPrefab.value) editingPrefab.value.node = value
      else if (editingLayout.value && project.value.layout) project.value.layout = value
      else activePage.value.root = value
    },
  })
  const selectedNodeIds = ref<string[]>([])
  const selectedNodeId = computed(() => selectedNodeIds.value[0] ?? null)
  const isPreviewMode = ref(false)
  /** Component types added lately, newest first. The library lists them up front. */
  const recentComponentTypes = useStorage<string[]>('ui-builder:recent-components', [])
  const checkpoints = useStorage<HistoryCheckpoint[]>('ui-builder:history-checkpoints', [])
  let historyTimer: ReturnType<typeof setTimeout> | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const saveDocument = () => {
    clearTimeout(saveTimer)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DOCUMENT_KEY, serializeProject(project.value))
      saveState.value = SaveState.Saved
    } catch {
      saveState.value = SaveState.Error
      setNotice('Could not save in this browser. Export your page to keep a backup.')
    }
  }
  const findNodeById = (id: string, node: UiNode = rootNode.value): UiNode | null => findNodeByIdInTree(id, node)

  const applyProjectSnapshot = (snapshot: string) => {
    const data = JSON.parse(snapshot)
    // Checkpoints saved before pages existed hold a single page tree.
    if (Array.isArray(data?.pages)) project.value = data
    else rootNode.value = data
    if (!project.value.layout) editingLayout.value = false
    activePageId.value = activePage.value.id
    selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
  }
  const history = createHistory({
    serialize: () => JSON.stringify(project.value),
    applySnapshot: applyProjectSnapshot,
    maxEntries: MAX_HISTORY_ENTRIES,
    describe: describeChange,
    // Anything that was removed can be brought back from the message that says so.
    onCommit: entry => {
      if (/^(Deleted|Removed)/.test(entry.label)) setNotice(`${entry.label}.`, true)
    },
  })
  const { versions: historyVersions, commit: commitHistory } = history
  // History records the project only, so a saved component being edited has no undo.
  const canUndo = computed(() => !editingPrefab.value && history.canUndo.value)
  const canRedo = computed(() => !editingPrefab.value && history.canRedo.value)
  // While a transaction runs, steps are not saved one by one: they become a single version at the end.
  let transactionDepth = 0
  const commit = () => {
    clearTimeout(historyTimer)
    if (transactionDepth === 0 && !history.isRestoring.value) commitHistory()
  }
  /**
   * Runs several changes as one undo step. If one of them fails, everything it changed is put back and the error is passed on.
   * Used by agents (MCP) that build a page in many small steps.
   */
  const transaction = <T>(run: () => T): T => {
    if (transactionDepth > 0) return run()
    commit()
    const before = JSON.stringify(project.value)
    transactionDepth++
    try {
      return run()
    } catch (error) {
      applyProjectSnapshot(before)
      throw error
    } finally {
      transactionDepth--
      commit()
    }
  }
  const undo = () => {
    if (editingPrefab.value) return
    clearTimeout(historyTimer)
    history.undo()
  }
  const redo = () => {
    if (editingPrefab.value) return
    clearTimeout(historyTimer)
    history.redo()
  }
  const restoreHistoryVersion = (index: number) => {
    clearTimeout(historyTimer)
    history.restore(index)
  }
  const createCheckpoint = (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return false
    commit()
    checkpoints.value = [
      {
        checkpointId: createNodeId('checkpoint'),
        name: trimmedName,
        createdAt: Date.now(),
        snapshot: JSON.stringify(project.value),
      },
      ...checkpoints.value,
    ].slice(0, MAX_CHECKPOINTS)
    return true
  }
  const restoreCheckpoint = (checkpointId: string) => {
    const checkpoint = checkpoints.value.find(item => item.checkpointId === checkpointId)
    if (!checkpoint) return false
    clearTimeout(historyTimer)
    try {
      history.restoreSnapshot(checkpoint.snapshot)
      return true
    } catch {
      setNotice('This checkpoint is invalid and could not be restored.')
      return false
    }
  }
  const deleteCheckpoint = (checkpointId: string) => {
    checkpoints.value = checkpoints.value.filter(item => item.checkpointId !== checkpointId)
  }

  watch(
    project,
    () => {
      saveState.value = SaveState.Saving
      clearTimeout(saveTimer)
      saveTimer = setTimeout(saveDocument, 250)
      if (!history.isRestoring.value) {
        clearTimeout(historyTimer)
        historyTimer = setTimeout(commit, HISTORY_COMMIT_DELAY_MS)
      }
    },
    { deep: true, flush: 'sync' },
  )
  onScopeDispose(() => {
    clearTimeout(historyTimer)
    clearTimeout(saveTimer)
  })

  const findParentAndIndex = (id: string, parent: UiNode = rootNode.value): NodeLocation | null =>
    findParentAndIndexInTree(id, parent)
  const canContain = (node: UiNode, slotName: string | null = null) => {
    const def = getComponentDef(node.type)
    return (
      !!def &&
      (slotName
        ? slotName !== 'default' && getNodeSlots(node).some(s => s.name === slotName)
        : !def.isLeaf && def.slots.some(s => s.name === 'default'))
    )
  }
  const insertionTarget = computed(() => {
    let node = selectedNodeId.value ? findNodeById(selectedNodeId.value) : rootNode.value
    while (node && !canContain(node)) node = findParentAndIndex(node.id)?.parent ?? null
    return node ?? rootNode.value
  })
  const selectNode = (id: string | null) => {
    selectedNodeIds.value = id && findNodeById(id) ? [id] : []
  }
  /** The name shown for an element. A page's root is shown under the page's own name, so it never has two names. */
  const nodeLabel = (node: UiNode) =>
    node.id === ROOT_NODE_ID ? (editingLayout.value ? node.name : activePage.value.name) : node.name
  const isPageRoot = (id: string) => id === ROOT_NODE_ID && !editingLayout.value
  const renameNode = (id: string, name: string) => {
    const node = findNodeById(id)
    const trimmedName = name.trim()
    if (!node || !trimmedName) return false
    if (isPageRoot(id)) return updatePageMutation(projectContext, activePage.value.id, { name: trimmedName })
    commit()
    node.name = trimmedName
    commit()
    return true
  }
  const updateSlotChildren = (id: string, slotName: string, children: UiNode[]) => {
    const node = findNodeById(id)
    if (!node || !getNodeSlots(node).some(slot => slot.name === slotName)) return false
    node.slots[slotName] = children
    return true
  }
  const updateNodeClasses = (id: string, classes: string[]) => {
    const node = findNodeById(id)
    if (!node) return false
    node.classes = classes
    return true
  }
  const updateNodeName = (id: string, name: string) => {
    const node = findNodeById(id)
    if (!node) return false
    if (isPageRoot(id)) {
      // Typing in the name field: keep the page name and its root in step (an empty name is not allowed).
      if (!name.trim()) return false
      activePage.value.name = name
    }
    node.name = name
    return true
  }
  /** `Data table`, then `Data table 2`, `Data table 3`… so similar elements can be told apart in Layers. */
  const uniqueNodeName = (name: string) => {
    const taken = new Set<string>()
    const collect = (node: UiNode) => {
      taken.add(node.name)
      node.children.forEach(collect)
      Object.values(node.slots).flat().forEach(collect)
    }
    collect(rootNode.value)
    if (!taken.has(name)) return name
    let n = 2
    while (taken.has(`${name} ${n}`)) n++
    return `${name} ${n}`
  }
  /** Replaces all properties of an element at once (the JSON view edits them as one object). */
  const updateNodeProps = (id: string, props: Record<string, unknown>) => {
    const node = findNodeById(id)
    if (!node) return false
    node.props = props
    return true
  }
  const updateNodeProp = (id: string, prop: string, value: unknown) => {
    const node = findNodeById(id)
    if (!node) return false
    node.props[prop] = value
    return true
  }
  const mutationContext: ContainerMutationContext & PrefabMutationContext & TemplateContext = {
    findNodeById,
    findParentAndIndex,
    getNodeList,
    canContain,
    cloneNodeWithNewIds,
    commit,
    selectNode,
    setNotice,
    clearDeletedSelection: () => {
      selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    },
    createNode: (type, name) => createNode(type, name),
    getComponentDef,
    setSelectedNodeIds: ids => {
      selectedNodeIds.value = ids
    },
    getPrefabs: () => prefabs.value,
    setPrefabs: value => {
      prefabs.value = value
    },
    uniqueName: uniqueNodeName,
    getInsertionTargetId: () => insertionTarget.value.id,
    appendNode: (parentId, node, slotName, prepare?: () => void) =>
      appendNode(mutationContext, parentId, node, slotName, prepare),
    ensureVariables: variables => {
      for (const [name, value] of Object.entries(variables)) {
        if (!(name in project.value.state)) project.value.state[name] = value
      }
    },
  }
  const createNode = (type: string, name?: string): UiNode => {
    const def = getComponentDef(type)
    if (!def) throw new Error('Unknown component type')
    const id = createNodeId()
    return {
      id,
      type,
      name: name ?? def.label,
      props: { ...def.defaultProps },
      classes: [...def.defaultClasses],
      slots: {},
      children: def.defaultTextChild
        ? [{ id: `${id}_text`, type: TEXT_NODE_TYPE, name: def.label, props: {}, classes: [], children: [], slots: {} }]
        : (def.defaultChildren ?? []).map(child => {
            if (typeof child === 'string') return createNode(child)
            const childNode = createNode(child.type, child.name)
            Object.assign(childNode.props, child.props)
            if (child.name && childNode.children[0]?.type === TEXT_NODE_TYPE) {
              childNode.children[0].name = child.name
            }
            return childNode
          }),
    }
  }
  const append = (parentId: string, node: UiNode, slotName: string | null = null) =>
    appendNode(mutationContext, parentId, node, slotName)
  const addComponent = (type: string, parentId = insertionTarget.value.id) => {
    const added = append(parentId, createNode(type))
    if (added) {
      recentComponentTypes.value = [type, ...recentComponentTypes.value.filter(item => item !== type)].slice(
        0,
        MAX_RECENT_COMPONENTS,
      )
    }
    return added
  }
  const savePrefab = (nodeId: string, name: string, defaults: PrefabPropValues = {}) =>
    savePrefabMutation(mutationContext, nodeId, name, defaults)
  const insertPrefab = (
    prefabId: string,
    parentId = insertionTarget.value.id,
    slotName: string | null = null,
    propValues: PrefabPropValues = {},
  ) => insertPrefabMutation(mutationContext, prefabId, parentId, slotName, propValues)
  const editPrefab = (prefabId: string) => {
    const prefab = prefabs.value.find(item => item.prefabId === prefabId)
    if (!prefab) return false
    editingPrefabId.value = prefabId
    // The component's own settings open at once: the properties panel stays collapsed while nothing is selected.
    selectedNodeIds.value = [prefab.node.id]
    return true
  }
  const stopEditingPrefab = () => {
    if (!editingPrefabId.value) return
    editingPrefabId.value = null
    selectedNodeIds.value = []
  }
  // Writing `{{props.name}}` in the edited component adds a parameter for it, deleting the last one removes it.
  watch(
    () => editingPrefab.value?.node,
    node => {
      const prefab = editingPrefab.value
      if (!prefab || !node) return
      const next = reconcilePrefabProps(node, prefab.props)
      if (JSON.stringify(next) !== JSON.stringify(prefab.props)) prefab.props = next
    },
    { deep: true, flush: 'sync' },
  )
  const duplicateNode = (id: string) => duplicateNodeMutation(mutationContext, id)
  const deleteNode = (id: string) => deleteNodeMutation(mutationContext, id)
  const areNodesSiblings = (ids: string[]) => areNodesSiblingsMutation(mutationContext, ids)
  const wrapNodes = (ids: string[], type: string) => wrapNodesMutation(mutationContext, ids, type)
  const unwrapReason = (id: string) => getUnwrapReason(mutationContext, id)
  const unwrapNode = (id: string) => unwrapNodeMutation(mutationContext, id)
  const pathTo = (id: string): UiNode[] => {
    const node = findNodeById(id)
    if (!node) return []
    const parent = findParentAndIndex(id)?.parent
    return [...(parent ? pathTo(parent.id) : []), node]
  }
  const moveNode = (id: string, parentId: string, slotName: string | null = null) =>
    moveNodeMutation(mutationContext, id, parentId, slotName)
  const canReorder = (id: string, direction: StepDirection) => canReorderNode(mutationContext, id, direction)
  const reorderNode = (id: string, direction: StepDirection) => reorderNodeMutation(mutationContext, id, direction)
  const importDocument = (text: string) => {
    const imported = parseProject(text)
    commit()
    project.value = imported
    activePageId.value = imported.pages[0].id
    editingLayout.value = false
    editingPrefabId.value = null
    selectedNodeIds.value = []
    commit()
    saveDocument()
    setNotice('Page imported. Undo returns to the previous page.', true)
  }

  // ─── Pages, shared layout and project state ──────────────────────────────
  const pages = computed(() => project.value.pages)
  const projectContext: ProjectMutationContext = {
    get project() {
      return project.value
    },
    getActivePageId: () => activePageId.value,
    setActivePageId: id => {
      activePageId.value = id
      editingPrefabId.value = null
    },
    setEditingLayout: editing => {
      editingLayout.value = editing
      editingPrefabId.value = null
    },
    clearSelection: () => {
      selectedNodeIds.value = []
    },
    commit,
    setNotice,
    createNode: (type, name) => createNode(type, name),
  }
  const updateNodeLogic = (id: string, patch: NodeLogicPatch) => updateNodeLogicMutation(mutationContext, id, patch)
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
  const findInPreview = (id: string) =>
    previewTrees.value.map(root => findNodeByIdInTree(id, root)).find(Boolean) ?? null
  /** Clicks an element in Preview as a person would. For a table row, `row` says which one was clicked. */
  const previewClick = (id: string, row?: number) => {
    if (!isPreviewMode.value) throw new Error('Preview is not running. Start it first.')
    const node = findInPreview(id)
    if (!node) throw new Error(`Node not found on the preview page: ${id}`)
    const click = node.events?.click
    if (!click) throw new Error(`“${node.name}” has no click action.`)
    const data = { ...node.props, ...resolveTableData(node.props, preview.state.value) }
    const item = row === undefined ? undefined : (Array.isArray(data.items) ? data.items : [])[row]
    if (row !== undefined && item === undefined) throw new Error(`The table has no row ${row}.`)
    preview.dispatch(bindAction(click, { ...preview.state.value, ...(row === undefined ? {} : { item, index: row }) }))
  }
  /** Types into an input in Preview: sets the variable the input is linked to. */
  const previewInput = (id: string, value: unknown) => {
    if (!isPreviewMode.value) throw new Error('Preview is not running. Start it first.')
    const node = findInPreview(id)
    if (!node?.model) throw new Error('That element is not linked to a variable.')
    preview.state.value[node.model] = value
  }
  const describePreview = () =>
    snapshotPreview(
      project.value,
      editingPrefab.value ? { ...preview.page.value, root: previewRoot.value } : preview.page.value,
      preview.state.value,
    )

  const addTemplate = (kind: TemplateKind) => addTemplateMutation(mutationContext, kind)

  return {
    project,
    pages,
    activePage,
    activePageId,
    editingLayout,
    editingPrefab,
    editPrefab,
    stopEditingPrefab,
    rootNode,
    selectedNodeIds,
    selectedNodeId,
    isPreviewMode,
    prefabs,
    recentComponentTypes,
    notice,
    noticeUndo,
    noticeSerial,
    setNotice,
    saveState,
    canUndo,
    canRedo,
    historyVersions,
    historyPending: history.pending,
    checkpoints,
    undo,
    redo,
    restoreHistoryVersion,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    commit,
    saveDocument,
    importDocument,
    exportDocument: () => serializeProject(project.value),
    selectPage: (id: string) => selectPageMutation(projectContext, id),
    addPage: (name: string, path?: string) => addPageMutation(projectContext, name, path),
    updatePage: (id: string, patch: { name?: string; path?: string }) => updatePageMutation(projectContext, id, patch),
    deletePage: (id: string) => deletePageMutation(projectContext, id),
    duplicatePage: (id: string) => duplicatePageMutation(projectContext, id),
    movePage: (id: string, direction: StepDirection) => movePageMutation(projectContext, id, direction),
    editLayout: (on: boolean) => editLayoutMutation(projectContext, on),
    removeLayout: () => removeLayoutMutation(projectContext),
    setStateVariable: (name: string, value: unknown) => setStateVariableMutation(projectContext, name, value),
    removeStateVariable: (name: string) => removeStateVariableMutation(projectContext, name),
    updateNodeLogic,
    table: {
      addColumn: (id: string, column?: Partial<tableMutations.TableColumn>) =>
        tableMutations.addColumn(mutationContext, id, column),
      updateColumn: (id: string, key: string, patch: Partial<tableMutations.TableColumn>) =>
        tableMutations.updateColumn(mutationContext, id, key, patch),
      removeColumn: (id: string, key: string) => tableMutations.removeColumn(mutationContext, id, key),
      addRow: (id: string, values?: tableMutations.TableRow, index?: number) =>
        tableMutations.addRow(mutationContext, id, values, index),
      updateRow: (id: string, index: number, values: tableMutations.TableRow) =>
        tableMutations.updateRow(mutationContext, id, index, values),
      removeRow: (id: string, index: number) => tableMutations.removeRow(mutationContext, id, index),
    },
    resetPreview: preview.reset,
    startPreview,
    previewClick,
    previewInput,
    describePreview,
    transaction,
    runtimeState: preview.state,
    previewPageId: preview.pageId,
    previewPage: preview.page,
    previewRoot,
    navigate: preview.navigate,
    dispatchAction: preview.dispatch,
    nodeLabel,
    findNodeById,
    findParentAndIndex,
    pathTo,
    createNode,
    canContain,
    insertionTarget,
    addComponent,
    addTemplate,
    duplicateNode,
    deleteNode,
    savePrefab,
    insertPrefab,
    deletePrefab: (id: string) => deletePrefabMutation(mutationContext, id),
    selectNode,
    renameNode,
    updateSlotChildren,
    updateNodeClasses,
    updateNodeName,
    updateNodeProp,
    updateNodeProps,
    toggleMultiSelect: (id: string) => {
      if (!findNodeById(id)) return
      selectedNodeIds.value = selectedNodeIds.value.includes(id)
        ? selectedNodeIds.value.filter(i => i !== id)
        : [...selectedNodeIds.value, id]
    },
    areNodesSiblings,
    wrapNodes,
    unwrapReason,
    unwrapNode,
    moveNode,
    reorderNode,
    canReorder,
    appendChild: (id: string, node: UiNode) => append(id, node),
    appendToSlot: (id: string, slot: string, node: UiNode) => append(id, node, slot),
  }
})
