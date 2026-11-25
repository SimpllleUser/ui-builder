import { ref, watch, type Ref } from 'vue'
import type { Prefab } from './types'

const SAVE_DELAY_MS = 250

export interface PrefabLibrary {
  list(): Promise<Prefab[]>
  put(prefab: Prefab): Promise<unknown>
  remove(prefabId: string): Promise<unknown>
  /** Calls `listener` when another tab changed the library. */
  subscribe(listener: () => void): void
}

/**
 * Keeps the list of saved components in step with the library: only what changed here is written, and changes
 * from other tabs are taken in without losing what is not written yet.
 */
export function usePrefabSync(prefabs: Ref<Prefab[]>, onError: () => void) {
  let library: PrefabLibrary | null = null
  /** Each component as the library has it, as text. */
  let stored = new Map<string, string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<void> = Promise.resolve()
  const pending = ref(false)

  const hasChanges = () =>
    prefabs.value.length !== stored.size ||
    prefabs.value.some(prefab => stored.get(prefab.prefabId) !== JSON.stringify(prefab))

  const writeChanges = async (target: PrefabLibrary) => {
    const present = new Set<string>()
    for (const prefab of [...prefabs.value]) {
      present.add(prefab.prefabId)
      const text = JSON.stringify(prefab)
      if (stored.get(prefab.prefabId) === text) continue
      // Parsed from the text: the storage cannot copy a reactive object.
      await target.put(JSON.parse(text))
      stored.set(prefab.prefabId, text)
    }
    for (const prefabId of [...stored.keys()]) {
      if (present.has(prefabId)) continue
      await target.remove(prefabId)
      stored.delete(prefabId)
    }
  }

  const enqueue = (task: (target: PrefabLibrary) => Promise<void>) => {
    queue = queue.then(async () => {
      if (!library) return
      try {
        await task(library)
      } catch {
        onError()
      }
      pending.value = hasChanges()
    })
    return queue
  }

  const flush = () => {
    clearTimeout(timer)
    return enqueue(writeChanges)
  }

  const takeIn = async (target: PrefabLibrary) => {
    await writeChanges(target)
    const list = await target.list()
    const local = new Map(prefabs.value.map(prefab => [prefab.prefabId, prefab]))
    const merged = list.flatMap(theirs => {
      const mine = local.get(theirs.prefabId)
      // Removed here while the list was being read.
      if (!mine) return stored.has(theirs.prefabId) ? [] : [theirs]
      const mineText = JSON.stringify(mine)
      const isUnwritten = mineText !== stored.get(theirs.prefabId)
      return [isUnwritten || mineText === JSON.stringify(theirs) ? mine : theirs]
    })
    const addedMeanwhile = prefabs.value.filter(prefab => !stored.has(prefab.prefabId))
    stored = new Map(list.map(prefab => [prefab.prefabId, JSON.stringify(prefab)]))
    prefabs.value = [...merged, ...addedMeanwhile]
  }

  watch(
    prefabs,
    () => {
      if (!library) return
      pending.value = true
      clearTimeout(timer)
      timer = setTimeout(flush, SAVE_DELAY_MS)
    },
    { deep: true, flush: 'sync' },
  )

  const open = async (target: PrefabLibrary) => {
    const list = await target.list()
    stored = new Map(list.map(prefab => [prefab.prefabId, JSON.stringify(prefab)]))
    prefabs.value = list
    library = target
    target.subscribe(() => void enqueue(takeIn))
  }

  const stop = () => clearTimeout(timer)

  return { open, flush, pending, stop }
}
