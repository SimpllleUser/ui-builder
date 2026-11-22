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
  /** The tree being edited: the shared layout or the active page. Every editing command works on it. */
  const rootNode = computed<UiNode>({
    get: () => (editingLayout.value && project.value.layout) || activePage.value.root,
    set: value => {
      if (editingLayout.value && project.value.layout) project.value.layout = value
      else activePage.value.root = value
    },
  })
  const selectedNodeIds = ref<string[]>([])
  const selectedNodeId = computed(() => selectedNodeIds.value[0] ?? null)
  const isPreviewMode = ref(false)
  const prefabs = useStorage<Prefab[]>('ui-builder:prefabs', [])
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

  const history = createHistory({
    serialize: () => JSON.stringify(project.value),
    applySnapshot: snapshot => {
      const data = JSON.parse(snapshot)
      // Checkpoints saved before pages existed hold a single page tree.
      if (Array.isArray(data?.pages)) project.value = data
      else rootNode.value = data
      if (!project.value.layout) editingLayout.value = false
      activePageId.value = activePage.value.id
      selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    },
    maxEntries: MAX_HISTORY_ENTRIES,
    describe: describeChange,
    // Anything that was removed can be brought back from the message that says so.
    onCommit: entry => {
      if (/^(Deleted|Removed)/.test(entry.label)) setNotice(`${entry.label}.`, true)
    },
  })
  const { canUndo, canRedo, versions: historyVersions, commit: commitHistory } = history
  const commit = () => {
    clearTimeout(historyTimer)
    if (!history.isRestoring.value) commitHistory()
  }
  const undo = () => {
    clearTimeout(historyTimer)
    history.undo()
  }
  const redo = () => {
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
  const savePrefab = (nodeId: string, name: string) => savePrefabMutation(mutationContext, nodeId, name)
  const insertPrefab = (prefabId: string, parentId = insertionTarget.value.id, slotName: string | null = null) =>
    insertPrefabMutation(mutationContext, prefabId, parentId, slotName)
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
    },
    setEditingLayout: editing => {
      editingLayout.value = editing
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

  const addTemplate = (kind: TemplateKind) => addTemplateMutation(mutationContext, kind)

  return {
    project,
    pages,
    activePage,
    activePageId,
    editingLayout,
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
    runtimeState: preview.state,
    previewPageId: preview.pageId,
    previewPage: preview.page,
    previewRoot: preview.root,
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
