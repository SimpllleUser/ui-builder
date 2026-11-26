import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef, getNodeSlots } from './componentDefinitions'
import { MAX_RECENT_COMPONENTS, ROOT_NODE_ID } from './constants'
import { emptyProject, parseProject, serializeProject } from './document'
import { UnsavedChanges, type OpenedProject } from './persistence'
import { useDocumentPersistence } from './documentPersistence'
import { cloneNodeWithNewIds, uniqueName } from './nodeUtils'
import type { ClipboardMutationContext } from './clipboard'
import { createNode } from './createNode'
import { useComponentEditing } from './componentEditing'
import { useEditorHistory } from './editorHistory'
import { useNodeEditing } from './nodeEditing'
import { usePreviewSession } from './previewSession'
import { usePrefabSync } from './prefabSync'
import { useComponentInstances } from './instanceStore'
import { isComputed } from './computedVariables'
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
  setComputed as setComputedMutation,
  setDataSource as setDataSourceMutation,
  updatePage as updatePageMutation,
  type ProjectMutationContext,
} from './projectMutations'
import {
  findNodeById as findNodeByIdInTree,
  findParentAndIndex as findParentAndIndexInTree,
  getNodeList,
  walkNodes,
  type NodeLocation,
} from './treeUtils'
import {
  editedPrefabId,
  isOnLayout,
  LAYOUT_TARGET,
  leavePrefabTarget,
  PAGE_TARGET,
  withoutLayout,
  type EditTarget,
} from './editTarget'
import { appendNode } from './nodeMutations'
import type { ContainerMutationContext } from './containerMutations'
import { deletePrefab as deletePrefabMutation, type PrefabMutationContext } from './prefabMutations'
import { addTemplate as addTemplateMutation, type TemplateContext, type TemplateProps } from './templateFactory'
import type { Breakpoint, StepDirection, TemplateKind } from './enums'
import type { DataSource, DeletedPrefab, Project, UiNode, Prefab } from './types'

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
  /** True while another project replaces the current one, which must not count as an edit. */
  let isOpening = false
  const project = ref<Project>(emptyProject())
  const activePageId = ref(project.value.pages[0].id)
  const editTarget = ref<EditTarget>(PAGE_TARGET)
  const editingLayout = computed(() => isOnLayout(editTarget.value))
  const persistence = useDocumentPersistence(() => serializeProject(project.value), setNotice)
  const { saveState, flush, save: saveDocument } = persistence
  watch(
    activePageId,
    id => {
      if (!isOpening) persistence.write(target => target.saveActivePageId(id))
    },
    { flush: 'sync' },
  )
  const activePage = computed(
    () => project.value.pages.find(page => page.id === activePageId.value) ?? project.value.pages[0],
  )
  /** My components. They belong to no project. */
  const prefabs = ref<Prefab[]>([])
  /** Deleted saved components that can be restored. */
  const deletedPrefabs = ref<DeletedPrefab[]>([])
  const prefabSync = usePrefabSync(prefabs, deletedPrefabs, () =>
    setNotice('Could not save My components in this browser.'),
  )
  /** The saved component opened for editing in place of the page, or null while a page or the layout is edited. */
  const editingPrefabId = computed(() => editedPrefabId(editTarget.value))
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
  /**
   * The Vuetify breakpoint being edited: the canvas has its width and style changes apply from it up.
   * Null edits all sizes and leaves the canvas as wide as the window allows.
   */
  const editingBreakpoint = ref<Breakpoint | null>(null)
  /** Component types added lately, newest first. The library lists them up front. */
  const recentComponentTypes = useStorage<string[]>('ui-builder:recent-components', [])

  const findNodeById = (id: string, node: UiNode = rootNode.value): UiNode | null => findNodeByIdInTree(id, node)

  const applyProjectSnapshot = (snapshot: string) => {
    const data = JSON.parse(snapshot)
    // Checkpoints saved before pages existed hold a single page tree.
    if (Array.isArray(data?.pages)) project.value = data
    else rootNode.value = data
    // An older version may hold instances as their originals were then.
    instances.syncRoots(projectRoots())
    if (!project.value.layout) editTarget.value = withoutLayout(editTarget.value)
    activePageId.value = activePage.value.id
    selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
  }
  const history = useEditorHistory({
    project,
    prefabs,
    deletedPrefabs,
    prefabSync,
    editingPrefab,
    editingPrefabId,
    applySnapshot: applyProjectSnapshot,
    pruneSelection: () => {
      selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    },
    removePrefab: prefabId => deletePrefabMutation(mutationContext, prefabId),
    writeToStorage: persistence.write,
    setNotice,
  })
  const { commit } = history

  const instances = useComponentInstances({ rootNode, prefabs, commit, setNotice })
  const projectRoots = () => [
    ...project.value.pages.map(page => page.root),
    ...(project.value.layout ? [project.value.layout] : []),
  ]
  let isRefreshing = false
  /** Brings every instance up to date with its original. This follows from the library, so it is no undo step. */
  const refreshInstances = () => {
    if (isRefreshing || isOpening) return
    isRefreshing = true
    try {
      instances.syncLibrary()
      history.follow(() => instances.syncRoots(projectRoots()))
    } finally {
      isRefreshing = false
    }
  }
  watch(() => JSON.stringify(prefabs.value), refreshInstances, { flush: 'sync' })

  watch(
    project,
    () => {
      if (isOpening) return
      persistence.markChanged()
      history.scheduleCommit()
    },
    { deep: true, flush: 'sync' },
  )
  onScopeDispose(() => {
    history.cancelScheduled()
    persistence.stop()
    prefabSync.stop()
  })

  const findParentAndIndex = (id: string, parent: UiNode = rootNode.value): NodeLocation | null =>
    findParentAndIndexInTree(id, parent)
  const canContain = (node: UiNode, slotName: string | null = null) => {
    if (instances.isLocked(node.id)) return false
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
    selectedNodeIds.value = id && findNodeById(id) ? [instances.selectableId(id)] : []
  }
  /** The name shown for an element. A page's root is shown under the page's own name, so it never has two names. */
  const nodeLabel = (node: UiNode) =>
    node.id === ROOT_NODE_ID ? (editingLayout.value ? node.name : activePage.value.name) : node.name
  const isPageRoot = (id: string) => id === ROOT_NODE_ID && !editingLayout.value
  const renameNode = (id: string, name: string) => {
    const node = findNodeById(id)
    const trimmedName = name.trim()
    if (!node || !trimmedName || instances.isInsideInstance(id)) return false
    if (isPageRoot(id)) return updatePageMutation(projectContext, activePage.value.id, { name: trimmedName })
    commit()
    node.name = trimmedName
    commit()
    return true
  }
  const mutationContext: ContainerMutationContext & PrefabMutationContext & TemplateContext & ClipboardMutationContext =
    {
      getRoot: () => rootNode.value,
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
      createNode,
      getComponentDef,
      setSelectedNodeIds: ids => {
        selectedNodeIds.value = ids
      },
      getPrefabs: () => prefabs.value,
      setPrefabs: value => {
        prefabs.value = value
      },
      uniqueName: name => uniqueName(name, new Set([...walkNodes(rootNode.value)].map(node => node.name))),
      getInsertionTargetId: () => insertionTarget.value.id,
      getEditingPrefabId: () => editingPrefabId.value,
      appendNode: (parentId, node, slotName, prepare?: () => void) =>
        appendNode(mutationContext, parentId, node, slotName, prepare),
      ensureVariables: variables => {
        for (const [name, value] of Object.entries(variables)) {
          if (!(name in project.value.state) && !isComputed(project.value, name)) project.value.state[name] = value
        }
      },
      ensureDataSettings: (computed, sources) => {
        for (const [name, formula] of Object.entries(computed)) {
          if (!(name in project.value.state) && !isComputed(project.value, name))
            project.value.computed = { ...project.value.computed, [name]: formula }
        }
        for (const [name, source] of Object.entries(sources)) {
          if (name in project.value.state && !project.value.sources?.[name])
            project.value.sources = { ...project.value.sources, [name]: source }
        }
      },
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
  const components = useComponentEditing({
    context: mutationContext,
    prefabs,
    prefabSync,
    editingPrefab,
    editingPrefabId,
    editTarget,
    selectedNodeIds,
    insertionTargetId: computed(() => insertionTarget.value.id),
    loadHistory: history.loadComponentHistory,
    setNotice,
  })
  const nodes = useNodeEditing({
    context: mutationContext,
    instances,
    project,
    prefabs,
    editingPrefabId,
    editingBreakpoint,
    rootNode,
    selectedNodeIds,
    isPageRoot,
    renamePage: name => {
      activePage.value.name = name
    },
  })
  const pathTo = (id: string): UiNode[] => {
    const node = findNodeById(id)
    if (!node) return []
    const parent = findParentAndIndex(id)?.parent
    return [...(parent ? pathTo(parent.id) : []), node]
  }
  const importDocument = (text: string) => {
    const imported = parseProject(text)
    commit()
    project.value = imported
    instances.syncRoots(projectRoots())
    activePageId.value = imported.pages[0].id
    editTarget.value = PAGE_TARGET
    selectedNodeIds.value = []
    commit()
    saveDocument()
    setNotice('Page imported. Undo returns to the previous page.', true)
  }

  /**
   * Replaces everything with another project. A damaged document throws before anything changes.
   * Unsaved changes of the project being left are written to its own storage, unless they are to be discarded.
   */
  const openProject = (opened: OpenedProject, unsaved = UnsavedChanges.Write) => {
    const next = parseProject(opened.document)
    persistence.connect(opened.storage, unsaved)
    history.cancelScheduled()
    isOpening = true
    try {
      isPreviewMode.value = false
      editingBreakpoint.value = null
      editTarget.value = PAGE_TARGET
      selectedNodeIds.value = []
      project.value = next
      // An offer to undo belongs to the project being left.
      if (noticeUndo.value) {
        notice.value = ''
        noticeUndo.value = false
      }
      activePageId.value = (next.pages.find(page => page.id === opened.activePageId) ?? next.pages[0]).id
      history.reset(opened.checkpoints)
    } finally {
      isOpening = false
    }
    // The originals may have changed while this project was closed.
    refreshInstances()
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
      editTarget.value = leavePrefabTarget(editTarget.value)
    },
    setEditingLayout: editing => {
      editTarget.value = editing ? LAYOUT_TARGET : PAGE_TARGET
    },
    clearSelection: () => {
      selectedNodeIds.value = []
    },
    commit,
    setNotice,
    createNode,
  }
  const preview = usePreviewSession({ project, activePage, editingPrefab, isPreviewMode, setNotice })

  const addTemplate = (kind: TemplateKind, props: TemplateProps = {}) =>
    addTemplateMutation(mutationContext, kind, props)

  return {
    ...components,
    ...nodes,
    ...preview,
    project,
    pages,
    activePage,
    activePageId,
    editingLayout,
    editingPrefab,
    rootNode,
    selectedNodeIds,
    selectedNodeId,
    isPreviewMode,
    editingBreakpoint,
    startGesture: history.startGesture,
    prefabs,
    recentComponentTypes,
    notice,
    noticeUndo,
    noticeSerial,
    setNotice,
    saveState,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    historyVersions: history.versions,
    historyPending: history.pending,
    checkpoints: history.checkpoints,
    undo: history.undo,
    redo: history.redo,
    restoreHistoryVersion: history.restoreHistoryVersion,
    createCheckpoint: history.createCheckpoint,
    restoreCheckpoint: history.restoreCheckpoint,
    deleteCheckpoint: history.deleteCheckpoint,
    commit,
    saveDocument,
    flush,
    openProject,
    openPrefabLibrary: prefabSync.open,
    flushPrefabs: () => {
      history.commitComponent()
      return prefabSync.flush()
    },
    hasUnsavedPrefabs: prefabSync.pending,
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
    transaction: history.transaction,
    setComputed: (name: string, formula: string | null) => setComputedMutation(projectContext, name, formula),
    setDataSource: (name: string, source: DataSource | null) => setDataSourceMutation(projectContext, name, source),
    nodeLabel,
    findNodeById,
    findParentAndIndex,
    pathTo,
    createNode,
    canContain,
    insertionTarget,
    addComponent,
    addTemplate,
    isLocked: instances.isLocked,
    isInsideInstance: instances.isInsideInstance,
    selectableId: instances.selectableId,
    originalOf: instances.originalOf,
    setInstanceProps: instances.setInstanceProps,
    detachInstance: instances.detachInstance,
    deletePrefab: history.deletePrefab,
    deletedPrefabs,
    restorePrefab: history.restorePrefab,
    selectNode,
    renameNode,
    toggleMultiSelect: (id: string) => {
      if (!findNodeById(id)) return
      const target = instances.selectableId(id)
      selectedNodeIds.value = selectedNodeIds.value.includes(target)
        ? selectedNodeIds.value.filter(i => i !== target)
        : [...selectedNodeIds.value, target]
    },
    appendChild: (id: string, node: UiNode) => append(id, node),
    appendToSlot: (id: string, slot: string, node: UiNode) => append(id, node, slot),
  }
})
