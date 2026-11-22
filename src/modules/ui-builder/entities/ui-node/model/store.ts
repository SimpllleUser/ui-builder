import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef, getNodeSlots } from './componentDefinitions'
import { HISTORY_COMMIT_DELAY_MS, MAX_CHECKPOINTS, MAX_HISTORY_ENTRIES, TEXT_NODE_TYPE } from './constants'
import { DOCUMENT_KEY, emptyProject, parseProject, serializeProject } from './document'
import { cloneNodeWithNewIds, createNodeId } from './nodeUtils'
import { usePreviewRuntime } from './previewRuntime'
import {
  addPage as addPageMutation, deletePage as deletePageMutation, editLayout as editLayoutMutation, removeLayout as removeLayoutMutation,
  removeStateVariable as removeStateVariableMutation, selectPage as selectPageMutation, setStateVariable as setStateVariableMutation,
  updatePage as updatePageMutation, type ProjectMutationContext,
} from './projectMutations'
import { findNodeById as findNodeByIdInTree, findParentAndIndex as findParentAndIndexInTree, getNodeList, type NodeLocation } from './treeUtils'
import { createHistory } from './history'
import { appendNode, updateNodeLogic as updateNodeLogicMutation, type NodeLogicPatch, canReorder as canReorderNode, deleteNode as deleteNodeMutation, duplicateNode as duplicateNodeMutation, moveNode as moveNodeMutation, reorderNode as reorderNodeMutation } from './nodeMutations'
import { areNodesSiblings as areNodesSiblingsMutation, getUnwrapReason, unwrapNode as unwrapNodeMutation, wrapNodes as wrapNodesMutation, type ContainerMutationContext } from './containerMutations'
import { deletePrefab as deletePrefabMutation, insertPrefab as insertPrefabMutation, savePrefab as savePrefabMutation, type PrefabMutationContext } from './prefabMutations'
import { addTemplate as addTemplateMutation, type TemplateContext, type TemplateKind } from './templateFactory'
import type { HistoryCheckpoint, Project, UiNode, Prefab } from './types'

export const useUiTreeStore = defineStore('ui-tree', () => {
  const notice = ref('')
  const saveState = ref<'saved' | 'saving' | 'error'>('saved')
  let initial: Project = emptyProject()
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(DOCUMENT_KEY)
      if (saved) initial = parseProject(saved)
    } catch {
      notice.value = 'Could not restore this page. The saved copy has not been changed. Import a backup to recover it.'
      saveState.value = 'error'
    }
  }
  const project = ref<Project>(initial)
  const activePageId = ref(initial.pages[0].id)
  const editingLayout = ref(false)
  const activePage = computed(() => project.value.pages.find(page => page.id === activePageId.value) ?? project.value.pages[0])
  /** The tree being edited: the shared layout or the active page. Every editing command works on it. */
  const setNotice = (message: string) => { notice.value = message }
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
  const checkpoints = useStorage<HistoryCheckpoint[]>('ui-builder:history-checkpoints', [])
  let historyTimer: ReturnType<typeof setTimeout> | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const saveDocument = () => {
    clearTimeout(saveTimer)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DOCUMENT_KEY, serializeProject(project.value))
      saveState.value = 'saved'
    } catch {
      saveState.value = 'error'
      notice.value = 'Could not save in this browser. Export your page to keep a backup.'
    }
  }
  const findNodeById = (id: string, node: UiNode = rootNode.value): UiNode | null =>
    findNodeByIdInTree(id, node)

  const history = createHistory(
    () => JSON.stringify(project.value),
    snapshot => {
      const data = JSON.parse(snapshot)
      // Checkpoints saved before pages existed hold a single page tree.
      if (Array.isArray(data?.pages)) project.value = data
      else rootNode.value = data
      if (!project.value.layout) editingLayout.value = false
      activePageId.value = activePage.value.id
      selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    },
    MAX_HISTORY_ENTRIES,
  )
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
      notice.value = 'This checkpoint is invalid and could not be restored.'
      return false
    }
  }
  const deleteCheckpoint = (checkpointId: string) => {
    checkpoints.value = checkpoints.value.filter(item => item.checkpointId !== checkpointId)
  }

  watch(project, () => {
    saveState.value = 'saving'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveDocument, 250)
    if (!history.isRestoring.value) {
      clearTimeout(historyTimer)
      historyTimer = setTimeout(commit, HISTORY_COMMIT_DELAY_MS)
    }
  }, { deep: true, flush: 'sync' })
  onScopeDispose(() => { clearTimeout(historyTimer); clearTimeout(saveTimer) })

  const findParentAndIndex = (id: string, parent: UiNode = rootNode.value): NodeLocation | null =>
    findParentAndIndexInTree(id, parent)
  const canContain = (node: UiNode, slotName: string | null = null) => {
    const def = getComponentDef(node.type)
    return !!def && (slotName
      ? slotName !== 'default' && getNodeSlots(node).some(s => s.name === slotName)
      : !def.isLeaf && def.slots.some(s => s.name === 'default'))
  }
  const insertionTarget = computed(() => {
    let node = selectedNodeId.value ? findNodeById(selectedNodeId.value) : rootNode.value
    while (node && !canContain(node)) node = findParentAndIndex(node.id)?.parent ?? null
    return node ?? rootNode.value
  })
  const selectNode = (id: string | null) => { selectedNodeIds.value = id && findNodeById(id) ? [id] : [] }
  const renameNode = (id: string, name: string) => {
    const node = findNodeById(id)
    const trimmedName = name.trim()
    if (!node || !trimmedName) return false
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
    node.name = name
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
    setSelectedNodeIds: ids => { selectedNodeIds.value = ids },
    getPrefabs: () => prefabs.value,
    setPrefabs: value => { prefabs.value = value },
    getInsertionTargetId: () => insertionTarget.value.id,
    appendNode: (parentId, node, slotName) => appendNode(mutationContext, parentId, node, slotName),
  }
  const createNode = (type: string, name?: string): UiNode => {
    const def = getComponentDef(type)
    if (!def) throw new Error('Unknown component type')
    const id = createNodeId()
    return {
      id, type, name: name ?? def.label, props: { ...def.defaultProps }, classes: [...def.defaultClasses], slots: {},
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
  const addComponent = (type: string, parentId = insertionTarget.value.id) => append(parentId, createNode(type))
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
  const canReorder = (id: string, direction: number) => canReorderNode(mutationContext, id, direction)
  const reorderNode = (id: string, direction: number) => reorderNodeMutation(mutationContext, id, direction)
  const importDocument = (text: string) => {
    const imported = parseProject(text)
    commit()
    project.value = imported
    activePageId.value = imported.pages[0].id
    editingLayout.value = false
    selectedNodeIds.value = []
    commit()
    saveDocument()
    notice.value = 'Page imported. Use Undo to return to the previous page.'
  }

  // ─── Pages, shared layout and project state ──────────────────────────────
  const pages = computed(() => project.value.pages)
  const projectContext: ProjectMutationContext = {
    get project() { return project.value },
    getActivePageId: () => activePageId.value,
    setActivePageId: id => { activePageId.value = id },
    setEditingLayout: editing => { editingLayout.value = editing },
    clearSelection: () => { selectedNodeIds.value = [] },
    commit,
    setNotice,
    createNode: (type, name) => createNode(type, name),
  }
  const updateNodeLogic = (id: string, patch: NodeLogicPatch) => updateNodeLogicMutation(mutationContext, id, patch)
  const preview = usePreviewRuntime({ project, activePage, isPreviewMode, setNotice })

  const addTemplate = (kind: TemplateKind) => addTemplateMutation(mutationContext, kind)

  return {
    project, pages, activePage, activePageId, editingLayout, rootNode, selectedNodeIds, selectedNodeId, isPreviewMode, prefabs, notice, saveState,
    canUndo, canRedo, historyVersions, historyPending: history.pending, checkpoints, undo, redo, restoreHistoryVersion,
    createCheckpoint, restoreCheckpoint, deleteCheckpoint, commit, saveDocument, importDocument,
    exportDocument: () => serializeProject(project.value),
    selectPage: (id: string) => selectPageMutation(projectContext, id),
    addPage: (name: string, path?: string) => addPageMutation(projectContext, name, path),
    updatePage: (id: string, patch: { name?: string; path?: string }) => updatePageMutation(projectContext, id, patch),
    deletePage: (id: string) => deletePageMutation(projectContext, id),
    editLayout: (on: boolean) => editLayoutMutation(projectContext, on),
    removeLayout: () => removeLayoutMutation(projectContext),
    setStateVariable: (name: string, value: unknown) => setStateVariableMutation(projectContext, name, value),
    removeStateVariable: (name: string) => removeStateVariableMutation(projectContext, name),
    updateNodeLogic,
    runtimeState: preview.state, previewPageId: preview.pageId, previewPage: preview.page, previewRoot: preview.root,
    navigate: preview.navigate, dispatchAction: preview.dispatch,
    findNodeById, findParentAndIndex, pathTo, createNode, canContain, insertionTarget,
    addComponent, addTemplate, duplicateNode, deleteNode, savePrefab, insertPrefab,
    deletePrefab: (id: string) => deletePrefabMutation(mutationContext, id),
    selectNode, renameNode, updateSlotChildren, updateNodeClasses, updateNodeName, updateNodeProp,
    toggleMultiSelect: (id: string) => {
      if (!findNodeById(id)) return
      selectedNodeIds.value = selectedNodeIds.value.includes(id) ? selectedNodeIds.value.filter(i => i !== id) : [...selectedNodeIds.value, id]
    },
    areNodesSiblings, wrapNodes, unwrapReason, unwrapNode, moveNode, reorderNode, canReorder,
    appendChild: (id: string, node: UiNode) => append(id, node),
    appendToSlot: (id: string, slot: string, node: UiNode) => append(id, node, slot),
  }
})
