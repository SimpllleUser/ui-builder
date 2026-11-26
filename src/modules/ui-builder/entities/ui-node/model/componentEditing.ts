import { watch, type ComputedRef, type Ref } from 'vue'
import { leavePrefabTarget, openPrefabTarget, type EditTarget } from './editTarget'
import { usePrefabEditLock } from './prefabEditLock'
import {
  insertPrefab as insertPrefabMutation,
  savePrefab as savePrefabMutation,
  type PrefabMutationContext,
} from './prefabMutations'
import { reconcilePrefabProps, type PrefabPropValues } from './prefabProps'
import type { usePrefabSync } from './prefabSync'
import type { Prefab } from './types'

interface ComponentEditingSources {
  context: PrefabMutationContext
  prefabs: Ref<Prefab[]>
  prefabSync: ReturnType<typeof usePrefabSync>
  editingPrefab: ComputedRef<Prefab | null>
  editingPrefabId: ComputedRef<string | null>
  editTarget: Ref<EditTarget>
  selectedNodeIds: Ref<string[]>
  insertionTargetId: ComputedRef<string>
  loadHistory(prefabId: string): Promise<void>
  setNotice(message: string): void
}

/** Saved components: saving an element as one, inserting instances, and editing the originals. */
export function useComponentEditing(sources: ComponentEditingSources) {
  const { context, prefabs, prefabSync, editingPrefab, editingPrefabId } = sources
  const { editTarget, selectedNodeIds, insertionTargetId, loadHistory, setNotice } = sources

  const savePrefab = (nodeId: string, name: string, defaults: PrefabPropValues = {}) =>
    savePrefabMutation(context, nodeId, name, defaults)
  const insertPrefab = (
    prefabId: string,
    parentId = insertionTargetId.value,
    slotName: string | null = null,
    propValues: PrefabPropValues = {},
  ) => insertPrefabMutation(context, prefabId, parentId, slotName, propValues)
  const editPrefab = (prefabId: string) => {
    const prefab = prefabs.value.find(item => item.prefabId === prefabId)
    if (!prefab) return false
    editTarget.value = openPrefabTarget(editTarget.value, prefabId)
    // The component's own settings open at once: the properties panel stays collapsed while nothing is selected.
    selectedNodeIds.value = [prefab.node.id]
    return true
  }
  const stopEditingPrefab = () => {
    if (!editingPrefabId.value) return
    editTarget.value = leavePrefabTarget(editTarget.value)
    selectedNodeIds.value = []
  }

  const editLock = usePrefabEditLock(editingPrefabId, {
    lock: prefabSync.lock,
    save: prefabSync.flush,
    onGranted: async prefabId => {
      // What the tab that edited it before wrote last may not have arrived yet.
      await prefabSync.refresh()
      await loadHistory(prefabId)
    },
    onRefused: prefabId => {
      const name = prefabs.value.find(prefab => prefab.prefabId === prefabId)?.name ?? 'This component'
      stopEditingPrefab()
      setNotice(`“${name}” is being edited in another tab.`)
    },
  })
  // The component being edited was removed, for example in another tab.
  watch(editingPrefab, prefab => {
    if (!prefab && editingPrefabId.value) stopEditingPrefab()
  })
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

  return {
    savePrefab,
    insertPrefab,
    editPrefab,
    stopEditingPrefab,
    /** Resolves once it is known whether the component just opened may be edited in this tab. */
    prefabEditSettled: editLock.settled,
  }
}
