import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef } from './componentDefinitions'
import { HISTORY_COMMIT_DELAY_MS, MAX_HISTORY_ENTRIES, ROOT_NODE_ID, TEXT_NODE_TYPE } from './constants'
import { DOCUMENT_KEY, emptyDocument, parseDocument, serializeDocument } from './document'
import { cloneNodeWithNewIds, createNodeId } from './nodeUtils'
import { findNodeById as findNodeByIdInTree, findParentAndIndex as findParentAndIndexInTree, getNodeList, type NodeLocation } from './treeUtils'
import { createHistory } from './history'
import { appendNode, canReorder as canReorderNode, deleteNode as deleteNodeMutation, duplicateNode as duplicateNodeMutation, moveNode as moveNodeMutation, reorderNode as reorderNodeMutation } from './nodeMutations'
import { areNodesSiblings as areNodesSiblingsMutation, getUnwrapReason, unwrapNode as unwrapNodeMutation, wrapNodes as wrapNodesMutation, type ContainerMutationContext } from './containerMutations'
import { deletePrefab as deletePrefabMutation, insertPrefab as insertPrefabMutation, savePrefab as savePrefabMutation, type PrefabMutationContext } from './prefabMutations'
import { addTemplate as addTemplateMutation, type TemplateContext, type TemplateKind } from './templateFactory'
import type { UiNode, Prefab } from './types'

export const useUiTreeStore = defineStore('ui-tree', () => {
  const notice = ref('')
  const saveState = ref<'saved' | 'saving' | 'error'>('saved')
  let initial = emptyDocument()
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(DOCUMENT_KEY)
      if (saved) initial = parseDocument(saved)
    } catch {
      notice.value = 'Could not restore this page. The saved copy has not been changed. Import a backup to recover it.'
      saveState.value = 'error'
    }
  }
  const rootNode = ref<UiNode>(initial)
  const selectedNodeIds = ref<string[]>([])
  const selectedNodeId = computed(() => selectedNodeIds.value[0] ?? null)
  const isPreviewMode = ref(false)
  const prefabs = useStorage<Prefab[]>('ui-builder:prefabs', [])
  let historyTimer: ReturnType<typeof setTimeout> | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const saveDocument = () => {
    clearTimeout(saveTimer)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DOCUMENT_KEY, serializeDocument(rootNode.value))
      saveState.value = 'saved'
    } catch {
      saveState.value = 'error'
      notice.value = 'Could not save in this browser. Export your page to keep a backup.'
    }
  }
  const findNodeById = (id: string, node: UiNode = rootNode.value): UiNode | null =>
    findNodeByIdInTree(id, node)

  const history = createHistory(
    () => JSON.stringify(rootNode.value),
    snapshot => {
      rootNode.value = JSON.parse(snapshot)
      selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    },
    MAX_HISTORY_ENTRIES,
  )
  const { canUndo, canRedo, commit: commitHistory } = history
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

  watch(rootNode, () => {
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
      ? slotName !== 'default' && def.slots.some(s => s.name === slotName)
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
    if (!node || !getComponentDef(node.type)?.slots.some(slot => slot.name === slotName)) return false
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
    setNotice: message => { notice.value = message },
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
    const document = parseDocument(text)
    commit()
    rootNode.value = document
    selectedNodeIds.value = []
    commit()
    saveDocument()
    notice.value = 'Page imported. Use Undo to return to the previous page.'
  }
  const addTemplate = (kind: TemplateKind) => addTemplateMutation(mutationContext, kind)

  return {
    rootNode, selectedNodeIds, selectedNodeId, isPreviewMode, prefabs, notice, saveState,
    canUndo, canRedo, undo, redo, commit, saveDocument, importDocument,
    exportDocument: () => serializeDocument(rootNode.value),
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
