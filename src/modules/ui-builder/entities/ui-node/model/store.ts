import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
import { useStorage } from '@vueuse/core'
import { getComponentDef } from './componentDefinitions'
import type { UiNode, Prefab } from './types'

const regenIds = (node: UiNode): UiNode => ({
  ...node,
  id: `ui_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
  children: (node.children ?? []).map(regenIds),
  slots: Object.fromEntries(
    Object.entries(node.slots ?? {}).map(([slotName, slotNodes]) => [slotName, slotNodes.map(regenIds)])
  ),
})

export const useUiTreeStore = defineStore('ui-tree', () => {
  const rootNode = ref<any>({
    id: 'root-canvas',
    type: 'VCard',
    name: 'Main Canvas',
    props: { variant: 'flat', color: 'transparent' },
    classes: ['w-100', 'h-100', 'pa-4'],
    children: [],
    slots: {}
  })

  const selectedNodeIds = ref<string[]>([])
  const selectedNodeId = computed(() => selectedNodeIds.value[0] ?? null)
  const isPreviewMode = ref(false)

  const prefabs = useStorage<Prefab[]>('ui-builder:prefabs', [])

  const MAX_HISTORY = 50
  const history = ref<string[]>([JSON.stringify(rootNode.value)])
  const historyIndex = ref(0)

  let _debounceTimer: ReturnType<typeof setTimeout> | null = null
  let _restoring = false

  const commit = () => {
    if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null }
    if (_restoring) return
    const snap = JSON.stringify(rootNode.value)
    if (history.value[historyIndex.value] === snap) return
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snap)
    if (history.value.length > MAX_HISTORY) history.value.shift()
    historyIndex.value = history.value.length - 1
  }

  watch(rootNode, () => {
    if (_restoring) return
    if (_debounceTimer) clearTimeout(_debounceTimer)
    _debounceTimer = setTimeout(commit, 600)
  }, { deep: true })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  const undo = () => {
    if (!canUndo.value) return
    _restoring = true
    historyIndex.value--
    rootNode.value = JSON.parse(history.value[historyIndex.value])
    selectedNodeIds.value = []
    nextTick(() => { _restoring = false })
  }

  const redo = () => {
    if (!canRedo.value) return
    _restoring = true
    historyIndex.value++
    rootNode.value = JSON.parse(history.value[historyIndex.value])
    selectedNodeIds.value = []
    nextTick(() => { _restoring = false })
  }

  const findNodeById = (id: string, node: any = rootNode.value): any | null => {
    if (node.id === id) return node
    for (const child of (node.children || [])) {
      const found = findNodeById(id, child)
      if (found) return found
    }
    for (const slotChildren of Object.values(node.slots || {})) {
      for (const child of (slotChildren as any[])) {
        const found = findNodeById(id, child)
        if (found) return found
      }
    }
    return null
  }

  const findParentAndIndex = (
    id: string,
    parent: any = rootNode.value
  ): { parent: any; index: number; slotName: string | null } | null => {
    const idx = (parent.children ?? []).findIndex((c: any) => c.id === id)
    if (idx !== -1) return { parent, index: idx, slotName: null }
    for (const [slotName, children] of Object.entries(parent.slots ?? {})) {
      const sIdx = (children as any[]).findIndex((c: any) => c.id === id)
      if (sIdx !== -1) return { parent, index: sIdx, slotName }
    }
    for (const child of parent.children ?? []) {
      const found = findParentAndIndex(id, child)
      if (found) return found
    }
    for (const slotChildren of Object.values(parent.slots ?? {})) {
      for (const child of slotChildren as any[]) {
        const found = findParentAndIndex(id, child)
        if (found) return found
      }
    }
    return null
  }

  const createNode = (type: string, name?: string): any => {
    const id = `ui_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const def = getComponentDef(type)

    const newNode: any = {
      id,
      type,
      name: def?.label ?? name ?? type,
      props: { ...(def?.defaultProps ?? {}) },
      classes: [...(def?.defaultClasses ?? [])],
      children: [],
      slots: {}
    }

    if (def?.defaultTextChild) {
      newNode.children.push({
        id: `${id}_text`,
        type: 'TEXT',
        name: def.label,
        props: {},
        classes: [],
        children: [],
        slots: {}
      })
    }

    if (def?.defaultChildren) {
      for (const childType of def.defaultChildren) {
        newNode.children.push(createNode(childType))
      }
    }

    return newNode
  }

  const savePrefab = (nodeId: string, name: string) => {
    const node = findNodeById(nodeId)
    if (!node) return
    const prefabId = `prefab_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
    prefabs.value = [...prefabs.value, { prefabId, name, node: JSON.parse(JSON.stringify(node)) }]
  }

  const insertPrefab = (prefabId: string, parentId: string, slotName: string | null = null) => {
    const prefab = prefabs.value.find(p => p.prefabId === prefabId)
    if (!prefab) return
    const newNode = regenIds(JSON.parse(JSON.stringify(prefab.node)) as UiNode)
    const parent = findNodeById(parentId)
    if (!parent) return
    if (slotName) {
      if (!parent.slots[slotName]) parent.slots[slotName] = []
      parent.slots[slotName].push(newNode)
    } else {
      parent.children.push(newNode)
    }
    commit()
  }

  const deletePrefab = (prefabId: string) => {
    prefabs.value = prefabs.value.filter(p => p.prefabId !== prefabId)
  }

  const duplicateNode = (id: string) => {
    const result = findParentAndIndex(id)
    if (!result) return
    const { parent, index, slotName } = result
    const original = slotName
      ? parent.slots[slotName][index]
      : parent.children[index]
    const clone = regenIds(JSON.parse(JSON.stringify(original)))
    if (slotName) {
      parent.slots[slotName].splice(index + 1, 0, clone)
    } else {
      parent.children.splice(index + 1, 0, clone)
    }
    selectedNodeIds.value = [clone.id]
    commit()
    return clone.id
  }

  const deleteNode = (id: string) => {
    const result = findParentAndIndex(id)
    if (!result) return false
    const { parent, index, slotName } = result
    if (slotName) {
      parent.slots[slotName].splice(index, 1)
    } else {
      parent.children.splice(index, 1)
    }
    selectedNodeIds.value = selectedNodeIds.value.filter((i: string) => i !== id)
    commit()
    return true
  }

  return {
    rootNode,
    selectedNodeIds,
    selectedNodeId,
    isPreviewMode,
    prefabs,
    canUndo,
    canRedo,
    undo,
    redo,
    commit,
    findNodeById,
    createNode,
    duplicateNode,
    deleteNode,
    savePrefab,
    insertPrefab,
    deletePrefab,

    selectNode: (id: string | null) => { selectedNodeIds.value = id ? [id] : [] },

    toggleMultiSelect: (id: string) => {
      const idx = selectedNodeIds.value.indexOf(id)
      if (idx === -1) selectedNodeIds.value = [...selectedNodeIds.value, id]
      else selectedNodeIds.value = selectedNodeIds.value.filter(i => i !== id)
    },

    areNodesSiblings: (ids: string[]): boolean => {
      if (ids.length < 2) return true
      const locs = ids.map(id => findParentAndIndex(id))
      if (locs.some(l => !l)) return false
      const first = locs[0]!
      return locs.every(l => l!.parent.id === first.parent.id && l!.slotName === first.slotName)
    },

    wrapNodes: (nodeIds: string[], wrapperType: string) => {
      if (nodeIds.length < 1) return
      const locs = nodeIds.map(id => findParentAndIndex(id)).filter(Boolean) as Array<{ parent: any; index: number; slotName: string | null }>
      if (locs.length !== nodeIds.length) return
      const first = locs[0]
      if (!locs.every(l => l.parent.id === first.parent.id && l.slotName === first.slotName)) return

      const targetArray: any[] = first.slotName
        ? first.parent.slots[first.slotName]
        : first.parent.children

      locs.sort((a, b) => a.index - b.index)
      const insertIndex = locs[0].index

      const nodesToWrap = locs.map(l => targetArray[l.index])

      const wrapper = createNode(wrapperType)
      wrapper.children = nodesToWrap

      for (const loc of [...locs].reverse()) {
        targetArray.splice(loc.index, 1)
      }
      targetArray.splice(insertIndex, 0, wrapper)
      selectedNodeIds.value = [wrapper.id]
      commit()
    },

    appendChild: (parentId: string, newNode: any) => {
      const p = findNodeById(parentId)
      if (p) {
        if (!p.children) p.children = []
        p.children.push(newNode)
        commit()
      }
    },

    appendToSlot: (parentId: string, slotName: string, newNode: any) => {
      const p = findNodeById(parentId)
      if (p) {
        if (!p.slots) p.slots = {}
        if (!p.slots[slotName]) p.slots[slotName] = []
        p.slots[slotName].push(newNode)
        commit()
      }
    },

    unwrapNode: (id: string) => {
      const loc = findParentAndIndex(id)
      if (!loc) return
      const { parent, index, slotName } = loc
      const targetArray: any[] = slotName ? parent.slots[slotName] : parent.children
      const node = targetArray[index]
      const children: any[] = node.children ?? []
      targetArray.splice(index, 1, ...children)
      selectedNodeIds.value = children.length ? [children[0].id] : []
      commit()
    },
  }
})
