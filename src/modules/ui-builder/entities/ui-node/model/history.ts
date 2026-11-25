import { computed, ref } from 'vue'

export interface HistoryEntry {
  snapshot: string
  /** What this version changed, e.g. “Added Data table”. */
  label: string
  at: number
}

interface HistoryOptions {
  serialize: () => string
  applySnapshot: (snapshot: string) => void
  maxEntries: number
  /** Names the change between two snapshots. */
  describe?: (previous: string, next: string) => string
  /** Called after a change was saved as a new version (not for undo and redo). */
  onCommit?: (entry: HistoryEntry) => void
}

export function createHistory({ serialize, applySnapshot, maxEntries, describe, onCommit }: HistoryOptions) {
  const entries = ref<HistoryEntry[]>([{ snapshot: serialize(), label: 'Opened', at: Date.now() }])
  const currentIndex = ref(0)
  const isRestoring = ref(false)

  const pending = computed(() => serialize() !== entries.value[currentIndex.value].snapshot)
  const canUndo = computed(() => pending.value || currentIndex.value > 0)
  const canRedo = computed(() => !pending.value && currentIndex.value < entries.value.length - 1)
  const versions = computed(() =>
    entries.value.map((entry, index) => ({
      index,
      label: entry.label,
      at: entry.at,
      isCurrent: index === currentIndex.value,
    })),
  )

  const commit = () => {
    const snapshot = serialize()
    const previous = entries.value[currentIndex.value].snapshot
    if (previous === snapshot) return

    const entry: HistoryEntry = { snapshot, label: describe?.(previous, snapshot) ?? 'Edited the page', at: Date.now() }
    entries.value = entries.value.slice(0, currentIndex.value + 1)
    entries.value.push(entry)
    if (entries.value.length > maxEntries) entries.value.shift()
    currentIndex.value = entries.value.length - 1
    onCommit?.(entry)
  }

  /** Takes what is there now as the current version: for changes that follow from elsewhere, not from an edit. */
  const amend = () => {
    entries.value[currentIndex.value].snapshot = serialize()
  }

  const restoreCurrent = () => {
    isRestoring.value = true
    try {
      applySnapshot(entries.value[currentIndex.value].snapshot)
      amend()
    } finally {
      isRestoring.value = false
    }
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

  const restoreSnapshot = (snapshot: string) => {
    commit()
    isRestoring.value = true
    try {
      applySnapshot(snapshot)
    } finally {
      isRestoring.value = false
    }
    commit()
  }

  /** Forgets every version and starts from what is there now. */
  const reset = () => {
    entries.value = [{ snapshot: serialize(), label: 'Opened', at: Date.now() }]
    currentIndex.value = 0
  }

  return {
    reset,
    isRestoring,
    pending,
    canUndo,
    canRedo,
    versions,
    commit,
    amend,
    undo,
    redo,
    restore,
    restoreSnapshot,
  }
}
