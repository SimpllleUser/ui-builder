import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef } from './componentDefinitions'
import { DOCUMENT_KEY, emptyDocument, parseDocument, serializeDocument } from './document'
import type { UiNode, Prefab } from './types'

const regenIds = (node: UiNode): UiNode => ({
  ...node,
  id: `ui_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
  children: node.children.map(regenIds),
  slots: Object.fromEntries(Object.entries(node.slots).map(([key, nodes]) => [key, nodes.map(regenIds)])),
})

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
  const history = ref<string[]>([JSON.stringify(initial)])
  const historyIndex = ref(0)
  let historyTimer: ReturnType<typeof setTimeout> | undefined
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let restoring = false

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
  const commit = () => {
    clearTimeout(historyTimer)
    if (restoring) return
    const snapshot = JSON.stringify(rootNode.value)
    if (history.value[historyIndex.value] === snapshot) return
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snapshot)
    if (history.value.length > 50) history.value.shift()
    historyIndex.value = history.value.length - 1
  }
  watch(rootNode, () => {
    saveState.value = 'saving'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveDocument, 250)
    if (!restoring) {
      clearTimeout(historyTimer)
      historyTimer = setTimeout(commit, 600)
    }
  }, { deep: true, flush: 'sync' })
  onScopeDispose(() => { clearTimeout(historyTimer); clearTimeout(saveTimer) })

  const pending = computed(() => JSON.stringify(rootNode.value) !== history.value[historyIndex.value])
  const canUndo = computed(() => pending.value || historyIndex.value > 0)
  const canRedo = computed(() => !pending.value && historyIndex.value < history.value.length - 1)
  const findNodeById = (id: string, node: UiNode = rootNode.value): UiNode | null => {
    if (node.id === id) return node
    for (const child of [...node.children, ...Object.values(node.slots).flat()]) {
      const found = findNodeById(id, child)
      if (found) return found
    }
    return null
  }
  const restore = () => {
    restoring = true
    rootNode.value = JSON.parse(history.value[historyIndex.value])
    selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    restoring = false
  }
  const undo = () => { commit(); if (historyIndex.value > 0) { historyIndex.value--; restore() } }
  const redo = () => { if (canRedo.value) { historyIndex.value++; restore() } }

  type Location = { parent: UiNode; index: number; slotName: string | null }
  const findParentAndIndex = (id: string, parent: UiNode = rootNode.value): Location | null => {
    const index = parent.children.findIndex(c => c.id === id)
    if (index !== -1) return { parent, index, slotName: null }
    for (const [slotName, nodes] of Object.entries(parent.slots)) {
      const index = nodes.findIndex(c => c.id === id)
      if (index !== -1) return { parent, index, slotName }
    }
    for (const child of [...parent.children, ...Object.values(parent.slots).flat()]) {
      const found = findParentAndIndex(id, child)
      if (found) return found
    }
    return null
  }
  const listAt = (loc: Location) => loc.slotName ? loc.parent.slots[loc.slotName] : loc.parent.children
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
  const createNode = (type: string, name?: string): UiNode => {
    const def = getComponentDef(type)
    if (!def) throw new Error('Unknown component type')
    const id = `ui_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
    return {
      id, type, name: name ?? def.label, props: { ...def.defaultProps }, classes: [...def.defaultClasses], slots: {},
      children: def.defaultTextChild
        ? [{ id: `${id}_text`, type: 'TEXT', name: def.label, props: {}, classes: [], children: [], slots: {} }]
        : (def.defaultChildren ?? []).map(type => createNode(type)),
    }
  }
  const append = (parentId: string, node: UiNode, slotName: string | null = null) => {
    const parent = findNodeById(parentId)
    if (!parent || !canContain(parent, slotName)) { notice.value = 'Choose a container that accepts this content.'; return false }
    commit()
    if (slotName) (parent.slots[slotName] ??= []).push(node)
    else parent.children.push(node)
    selectNode(node.id)
    commit()
    notice.value = `Added ${node.name} to ${parent.name}${slotName ? ` / ${slotName}` : ''}.`
    return true
  }
  const addComponent = (type: string, parentId = insertionTarget.value.id) => append(parentId, createNode(type))
  const savePrefab = (nodeId: string, name: string) => {
    const node = findNodeById(nodeId)
    if (!node || !name.trim()) return
    prefabs.value = [...prefabs.value, { prefabId: `prefab_${Date.now()}_${Math.random().toString(36).slice(2)}`, name: name.trim(), node: JSON.parse(JSON.stringify(node)) }]
    notice.value = `Saved ${name.trim()} to My components.`
  }
  const insertPrefab = (prefabId: string, parentId = insertionTarget.value.id, slotName: string | null = null) => {
    const prefab = prefabs.value.find(p => p.prefabId === prefabId)
    if (!prefab) return false
    let parent = findNodeById(parentId)
    if (!slotName) while (parent && !canContain(parent)) parent = findParentAndIndex(parent.id)?.parent ?? null
    return append(parent?.id ?? 'root-canvas', regenIds(JSON.parse(JSON.stringify(prefab.node))), slotName)
  }
  const duplicateNode = (id: string) => {
    const loc = findParentAndIndex(id)
    if (!loc) return
    commit()
    const list = listAt(loc)
    const clone = regenIds(JSON.parse(JSON.stringify(list[loc.index])))
    list.splice(loc.index + 1, 0, clone)
    selectNode(clone.id)
    commit()
    return clone.id
  }
  const deleteNode = (id: string) => {
    const loc = findParentAndIndex(id)
    if (!loc) return false
    commit()
    listAt(loc).splice(loc.index, 1)
    selectedNodeIds.value = selectedNodeIds.value.filter(id => findNodeById(id))
    commit()
    notice.value = 'Element deleted. Use Undo to restore it.'
    return true
  }
  const areNodesSiblings = (ids: string[]) => {
    const locs = ids.map(id => findParentAndIndex(id))
    return locs.length > 0 && locs.every(l => l && l.parent.id === locs[0]?.parent.id && l.slotName === locs[0]?.slotName)
  }
  const wrapNodes = (ids: string[], type: string) => {
    if (!areNodesSiblings(ids) || !getComponentDef(type)?.isWrapContainer) return
    commit()
    const locs = ids.map(id => findParentAndIndex(id)!).sort((a, b) => a.index - b.index)
    const list = listAt(locs[0])
    const wrapper = createNode(type)
    wrapper.children = locs.map(l => list[l.index])
    for (const loc of [...locs].reverse()) list.splice(loc.index, 1)
    list.splice(locs[0].index, 0, wrapper)
    selectNode(wrapper.id)
    commit()
  }
  const unwrapReason = (id: string): string => {
    const node = findNodeById(id)
    if (!node || id === 'root-canvas' || !getComponentDef(node.type)?.isWrapContainer) return 'Choose a container to unwrap.'
    if (Object.values(node.slots).some(nodes => nodes.length)) return 'Move content out of named slots before unwrapping this container.'
    if (!node.children.length) return 'This container has no children to unwrap.'
    return ''
  }
  const unwrapNode = (id: string) => {
    const reason = unwrapReason(id)
    if (reason) { notice.value = reason; return false }
    const loc = findParentAndIndex(id)!
    commit()
    const list = listAt(loc)
    const children = list[loc.index].children
    list.splice(loc.index, 1, ...children)
    selectedNodeIds.value = children.map(n => n.id)
    commit()
    return true
  }
  const pathTo = (id: string): UiNode[] => {
    const node = findNodeById(id)
    if (!node) return []
    const parent = findParentAndIndex(id)?.parent
    return [...(parent ? pathTo(parent.id) : []), node]
  }
  const moveNode = (id: string, parentId: string, slotName: string | null = null) => {
    const node = findNodeById(id)
    const loc = findParentAndIndex(id)
    const parent = findNodeById(parentId)
    if (!node || !loc || !parent || !canContain(parent, slotName) || findNodeById(parentId, node)) return false
    commit()
    listAt(loc).splice(loc.index, 1)
    if (slotName) (parent.slots[slotName] ??= []).push(node)
    else parent.children.push(node)
    commit()
    selectNode(id)
    notice.value = `Moved ${node.name} to ${parent.name}.`
    return true
  }
  const canReorder = (id: string, direction: number) => {
    const loc = findParentAndIndex(id)
    return !!loc && loc.index + direction >= 0 && loc.index + direction < listAt(loc).length
  }
  const reorderNode = (id: string, direction: number) => {
    if (!canReorder(id, direction)) return
    commit()
    const loc = findParentAndIndex(id)!
    const list = listAt(loc)
    list.splice(loc.index + direction, 0, list.splice(loc.index, 1)[0])
    commit()
  }
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
        col.children = [regenIds(JSON.parse(JSON.stringify(card)))]
        return col
      })
      append('root-canvas', row)
    } else append('root-canvas', card)
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
