import { ref, type Ref } from 'vue'
import { MAX_DELETED_PREFABS } from './constants'
import { cloneNode } from './nodeUtils'
import type { DeletedPrefab, Prefab } from './types'

/**
 * Deleted saved components, newest first. Any of them can be restored; the one deleted last is also what Undo
 * brings back, and Redo removes again, for as long as nothing else was edited since.
 */
export function useDeletedPrefabs(prefabs: Ref<Prefab[]>, deleted: Ref<DeletedPrefab[]>) {
  const undoableId = ref<string | null>(null)
  const redoableId = ref<string | null>(null)

  const forget = () => {
    undoableId.value = null
    redoableId.value = null
  }
  const without = (prefabId: string) => deleted.value.filter(entry => entry.prefab.prefabId !== prefabId)

  /** Call right before the component is removed. */
  const remember = (prefabId: string) => {
    const index = prefabs.value.findIndex(prefab => prefab.prefabId === prefabId)
    if (index < 0) return
    const entry = { prefab: cloneNode(prefabs.value[index]), index, deletedAt: Date.now() }
    deleted.value = [entry, ...without(prefabId)].slice(0, MAX_DELETED_PREFABS)
    undoableId.value = prefabId
    redoableId.value = null
  }

  /** Puts a deleted component back where it was and gives it back, or null when it cannot be. */
  const restore = (prefabId: string): Prefab | null => {
    const entry = deleted.value.find(item => item.prefab.prefabId === prefabId)
    if (!entry) return null
    deleted.value = without(prefabId)
    forget()
    // Another tab may have brought it back already.
    if (prefabs.value.some(item => item.prefabId === prefabId)) return null
    const list = [...prefabs.value]
    list.splice(entry.index, 0, entry.prefab)
    prefabs.value = list
    return entry.prefab
  }

  return { undoableId, redoableId, remember, restore, forget }
}
