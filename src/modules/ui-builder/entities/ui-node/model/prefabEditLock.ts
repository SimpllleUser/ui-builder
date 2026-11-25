import { watch, type Ref } from 'vue'
import type { HeldLock } from '../../../../../shared/lib/webLocks'

interface EditLockSources {
  lock(prefabId: string): Promise<HeldLock | null>
  /** Writes the component before another tab may edit it. */
  save(): Promise<void>
  onRefused(prefabId: string): void
  /** Called once no other tab can be editing the component any more. */
  onGranted(prefabId: string): Promise<void>
}

/**
 * Holds the lock of the component being edited. Editing starts at once and is taken back when the lock turns out
 * to be held by another tab.
 */
export function usePrefabEditLock(
  editingId: Ref<string | null>,
  { lock, save, onRefused, onGranted }: EditLockSources,
) {
  let held: { id: string; lock: HeldLock } | null = null
  let queue: Promise<void> = Promise.resolve()

  const follow = async () => {
    if (held && held.id !== editingId.value) {
      await save()
      held.lock.release()
      held = null
    }
    const wanted = editingId.value
    if (!wanted || held?.id === wanted) return
    const granted = await lock(wanted)
    if (editingId.value !== wanted) granted?.release()
    else if (granted) {
      held = { id: wanted, lock: granted }
      await onGranted(wanted)
    } else onRefused(wanted)
  }

  watch(
    editingId,
    () => {
      queue = queue.then(follow).catch(() => {})
    },
    { flush: 'sync' },
  )

  /** Resolves once it is known whether the component just opened may be edited here. */
  return { settled: () => queue }
}
