import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef } from './componentDefinitions'
import { HISTORY_COMMIT_DELAY_MS, MAX_HISTORY_ENTRIES, ROOT_NODE_ID, TEXT_NODE_TYPE } from './constants'
import { DOCUMENT_KEY, emptyDocument, parseDocument, serializeDocument } from './document'
import { cloneNode, cloneNodeWithNewIds, createNodeId } from './nodeUtils'
import { findNodeById as findNodeByIdInTree, findParentAndIndex as findParentAndIndexInTree, getNodeList, type NodeLocation } from './treeUtils'
import { createHistory } from './history'
import { appendNode, canReorder as canReorderNode, deleteNode as deleteNodeMutation, duplicateNode as duplicateNodeMutation, moveNode as moveNodeMutation, reorderNode as reorderNodeMutation } from './nodeMutations'
import { areNodesSiblings as areNodesSiblingsMutation, getUnwrapReason, unwrapNode as unwrapNodeMutation, wrapNodes as wrapNodesMutation, type ContainerMutationContext } from './containerMutations'
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
  const mutationContext: ContainerMutationContext = {
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
    createNode: type => createNode(type),
    getComponentDef,
    setSelectedNodeIds: ids => { selectedNodeIds.value = ids },
  }
  const createNode = (type: string, name?: string): UiNode => {
    const def = getComponentDef(type)
    if (!def) throw new Error('Unknown component type')
    const id = createNodeId()
    return {
      id, type, name: name ?? def.label, props: { ...def.defaultProps }, classes: [...def.defaultClasses], slots: {},
      children: def.defaultTextChild
        ? [{ id: `${id}_text`, type: TEXT_NODE_TYPE, name: def.label, props: {}, classes: [], children: [], slots: {} }]
        : (def.defaultChildren ?? []).map(type => createNode(type)),
    }
  }
  const append = (parentId: string, node: UiNode, slotName: string | null = null) =>
    appendNode(mutationContext, parentId, node, slotName)
  const addComponent = (type: string, parentId = insertionTarget.value.id) => append(parentId, createNode(type))
  const savePrefab = (nodeId: string, name: string) => {
    const node = findNodeById(nodeId)
    if (!node || !name.trim()) return
    prefabs.value = [...prefabs.value, { prefabId: createNodeId('prefab'), name: name.trim(), node: cloneNode(node) }]
    notice.value = `Saved ${name.trim()} to My components.`
  }
  const insertPrefab = (prefabId: string, parentId = insertionTarget.value.id, slotName: string | null = null) => {
    const prefab = prefabs.value.find(p => p.prefabId === prefabId)
    if (!prefab) return false
    let parent = findNodeById(parentId)
    if (!slotName) while (parent && !canContain(parent)) parent = findParentAndIndex(parent.id)?.parent ?? null
    return append(parent?.id ?? ROOT_NODE_ID, cloneNodeWithNewIds(prefab.node), slotName)
  }
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
  const addTemplate = (kind: 'card' | 'form' | 'columns') => {
    const card = createNode('VCard', kind === 'form' ? 'Contact form' : 'Welcome card')
    card.classes = ['pa-6', 'rounded-lg']
    const title = createNode('VCardTitle')
    title.classes.push('text-wrap')
    title.children[0].name = kind === 'form' ? 'Get in touch' : 'Your next idea starts here'
    const text = createNode('VCardText')
    text.children[0].name = 'Select an element to edit its content and appearance.'
    const button = createNode('VBtn')
    button.props = { color: 'primary', variant: 'flat' }
    button.children[0].name = kind === 'form' ? 'Send message' : 'Get started'
    card.children = [title, text]
    if (kind === 'form') {
      for (const label of ['Name', 'Email', 'Message']) {
        const input = createNode('VTextField')
        input.props = { label, variant: 'outlined', type: label === 'Email' ? 'email' : 'text' }
        card.children.push(input)
      }
    }
    card.children.push(button)
    if (kind === 'columns') {
      const row = createNode('VRow', 'Two columns')
      row.children = [1, 2].map(n => {
        const col = createNode('VCol', `Column ${n}`)
        col.props = { cols: 12, md: 6 }
        col.children = [cloneNodeWithNewIds(card)]
        return col
      })
      append(ROOT_NODE_ID, row)
    } else append(ROOT_NODE_ID, card)
  }

  return {
    rootNode, selectedNodeIds, selectedNodeId, isPreviewMode, prefabs, notice, saveState,
    canUndo, canRedo, undo, redo, commit, saveDocument, importDocument,
    exportDocument: () => serializeDocument(rootNode.value),
    findNodeById, findParentAndIndex, pathTo, createNode, canContain, insertionTarget,
    addComponent, addTemplate, duplicateNode, deleteNode, savePrefab, insertPrefab,
    deletePrefab: (id: string) => { prefabs.value = prefabs.value.filter(p => p.prefabId !== id); notice.value = 'Saved component deleted.' },
    selectNode,
    toggleMultiSelect: (id: string) => {
      if (!findNodeById(id)) return
      selectedNodeIds.value = selectedNodeIds.value.includes(id) ? selectedNodeIds.value.filter(i => i !== id) : [...selectedNodeIds.value, id]
    },
    areNodesSiblings, wrapNodes, unwrapReason, unwrapNode, moveNode, reorderNode, canReorder,
    appendChild: (id: string, node: UiNode) => append(id, node),
    appendToSlot: (id: string, slot: string, node: UiNode) => append(id, node, slot),
  }
})
