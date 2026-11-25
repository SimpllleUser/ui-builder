import { ref, type Ref } from 'vue'
import { cloneNode } from './nodeUtils'
import type { SavedHistory } from './history'
import type { Prefab } from './types'

/**
 * The saved component deleted last, which Undo brings back for as long as nothing else was edited since.
 * Its instances follow it again once it is back.
 */
export function useDeletedPrefab(
  prefabs: Ref<Prefab[]>,
  readHistory: (prefabId: string) => Promise<SavedHistory | null>,
) {
  const deleted = ref<{ prefab: Prefab; index: number } | null>(null)
  /** The stored history of the deleted component: removing the component removes it from the library. */
  let history: Promise<SavedHistory | null> = Promise.resolve(null)

  /** Call right before the component is removed. */
  const remember = (prefabId: string) => {
    const index = prefabs.value.findIndex(prefab => prefab.prefabId === prefabId)
    if (index < 0) return
    deleted.value = { prefab: cloneNode(prefabs.value[index]), index }
    history = readHistory(prefabId)
  }
  const forget = () => {
    deleted.value = null
  }
  /** Puts the component back where it was and gives it back with its stored history, or null when there is none. */
  const bringBack = (): { prefab: Prefab; history: Promise<SavedHistory | null> } | null => {
    if (!deleted.value) return null
    const { prefab, index } = deleted.value
    forget()
    // Another tab may have brought it back already.
    if (prefabs.value.some(item => item.prefabId === prefab.prefabId)) return null
    prefabs.value = [...prefabs.value.slice(0, index), prefab, ...prefabs.value.slice(index)]
    return { prefab, history }
  }

  return { deleted, remember, forget, bringBack }
}
