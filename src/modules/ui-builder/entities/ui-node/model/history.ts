import { computed, ref } from 'vue'

export function createHistory(
  serialize: () => string,
  restoreSnapshot: (snapshot: string) => void,
  maxEntries: number,
) {
  const entries = ref<string[]>([serialize()])
  const currentIndex = ref(0)
  const isRestoring = ref(false)

  const pending = computed(() => serialize() !== entries.value[currentIndex.value])
  const canUndo = computed(() => pending.value || currentIndex.value > 0)
  const canRedo = computed(() => !pending.value && currentIndex.value < entries.value.length - 1)
  const versions = computed(() => entries.value.map((_, index) => ({
    index,
    label: index === 0 ? 'Initial version' : `Version ${index + 1}`,
    isCurrent: index === currentIndex.value,
  })))

  const commit = () => {
    const snapshot = serialize()
    if (entries.value[currentIndex.value] === snapshot) return

    entries.value = entries.value.slice(0, currentIndex.value + 1)
    entries.value.push(snapshot)
    if (entries.value.length > maxEntries) entries.value.shift()
    currentIndex.value = entries.value.length - 1
  }

  const restoreCurrent = () => {
    isRestoring.value = true
    restoreSnapshot(entries.value[currentIndex.value])
    isRestoring.value = false
  }

  const undo = () => {
    commit()
    if (currentIndex.value > 0) {
      currentIndex.value--
      restoreCurrent()
    }
  }

  const redo = () => {
    if (canRedo.value) {
      currentIndex.value++
      restoreCurrent()
    }
  }

  const restore = (index: number) => {
    if (index < 0 || index >= entries.value.length) return
    const wasCurrent = index === currentIndex.value
    const hadPendingChanges = pending.value
    commit()
    if (wasCurrent && hadPendingChanges) return
    currentIndex.value = index
    restoreCurrent()
  }

  return { isRestoring, pending, canUndo, canRedo, versions, commit, undo, redo, restore }
}
