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

  return { isRestoring, pending, canUndo, canRedo, commit, undo, redo }
}
