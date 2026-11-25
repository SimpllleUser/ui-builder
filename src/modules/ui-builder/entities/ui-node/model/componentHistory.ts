import { computed, onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { syncInstances, prefabLookup } from './componentInstances'
import { HISTORY_COMMIT_DELAY_MS, MAX_HISTORY_ENTRIES } from './constants'
import { createHistory, type HistoryEntry, type SavedHistory } from './history'
import { describeChange } from './historyLabels'
import type { Prefab, Project } from './types'

/** The name of a step that was not recorded here, such as a change made just before the app was closed. */
export const OUTSIDE_CHANGE_LABEL = 'Changed outside the editor'

type History = ReturnType<typeof createHistory>

interface ComponentHistorySources {
  prefabs: Ref<Prefab[]>
  editingPrefabId: Ref<string | null>
  /** True while several changes are being gathered into one step. */
  isHeld(): boolean
  onCommit(entry: HistoryEntry): void
  /** Called after a version was brought back, for the selection to follow. */
  onRestored(): void
  read(prefabId: string): Promise<SavedHistory | null>
  write(prefabId: string, history: SavedHistory): void
}

/**
 * Undo and redo of saved components: each has a history of its own, stored with the library, so a change can be
 * taken back after the editor was left or the app was reloaded, also one made in another tab. Every instance then
 * follows the version brought back.
 */
export function useComponentHistory(sources: ComponentHistorySources) {
  const { prefabs, editingPrefabId, isHeld, onCommit, onRestored, read, write } = sources
  const histories = new Map<string, History>()
  const current = shallowRef<History | null>(null)
  /** The component whose stored history was read: only then is writing it safe. */
  let loadedId: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const find = (prefabId: string) => prefabs.value.find(prefab => prefab.prefabId === prefabId)

  /** The component as a project of one page, so changes to it are named like changes to a page. */
  const serialize = (prefabId: string) => {
    const prefab = find(prefabId)
    if (!prefab) return ''
    const project: Project = {
      pages: [{ id: prefabId, name: prefab.name, path: '/', root: prefab.node }],
      layout: null,
      state: {},
    }
    return JSON.stringify({ ...project, props: prefab.props })
  }

  const apply = (prefabId: string, snapshot: string) => {
    const prefab = find(prefabId)
    if (!prefab) return
    const data: Project & Pick<Prefab, 'props'> = JSON.parse(snapshot)
    // The element first: its parameters are worked out from it, and the saved defaults then replace them.
    prefab.node = data.pages[0].root
    prefab.props = data.props
    // An older version may hold other components as they were then.
    syncInstances(prefab.node, prefabLookup(prefabs.value), prefabId)
    onRestored()
  }

  const store = (prefabId: string) => {
    const history = histories.get(prefabId)
    if (history) write(prefabId, history.dump())
  }
  const storeIfLoaded = (prefabId: string | null) => {
    if (prefabId && prefabId === loadedId) store(prefabId)
  }

  /** A snapshot with the components inside it as they are now. */
  const upToDate = (prefabId: string, snapshot: string) => {
    const data: Project = JSON.parse(snapshot)
    syncInstances(data.pages[0].root, prefabLookup(prefabs.value), prefabId)
    return JSON.stringify(data)
  }

  /** Brings a history in step with the component, which may have changed since its last version. */
  const reconcile = (prefabId: string, history: History) => {
    if (!history.pending.value) return
    // Only a component inside it changed: that is no step of this one.
    if (upToDate(prefabId, history.currentSnapshot()) === serialize(prefabId)) history.amend()
    // Kept as a step of its own, so undoing it is a choice the person can see.
    else history.commit(OUTSIDE_CHANGE_LABEL)
  }

  const open = (prefabId: string) => {
    const existing = histories.get(prefabId)
    if (existing) {
      reconcile(prefabId, existing)
      return existing
    }
    const created = createHistory({
      serialize: () => serialize(prefabId),
      applySnapshot: snapshot => apply(prefabId, snapshot),
      maxEntries: MAX_HISTORY_ENTRIES,
      describe: describeChange,
      onCommit: entry => {
        storeIfLoaded(prefabId)
        onCommit(entry)
      },
    })
    histories.set(prefabId, created)
    return created
  }

  /** Carries on the stored history of the component being edited. */
  const load = async (prefabId: string) => {
    const saved = await read(prefabId)
    const history = current.value
    if (editingPrefabId.value !== prefabId || !history) return
    if (saved) history.load(saved)
    reconcile(prefabId, history)
    loadedId = prefabId
    store(prefabId)
  }

  /** Records what changed since the last version of the component being edited. */
  const commit = () => {
    clearTimeout(timer)
    const history = current.value
    // A deleted component has nothing left to record.
    const exists = !!history && prefabs.value.some(prefab => histories.get(prefab.prefabId) === history)
    if (history && exists && !isHeld() && !history.isRestoring.value) history.commit()
  }

  watch(
    editingPrefabId,
    prefabId => {
      commit()
      loadedId = null
      current.value = prefabId && find(prefabId) ? open(prefabId) : null
    },
    { flush: 'sync' },
  )
  watch(
    () => editingPrefabId.value && serialize(editingPrefabId.value),
    () => {
      if (!current.value || current.value.isRestoring.value) return
      clearTimeout(timer)
      timer = setTimeout(commit, HISTORY_COMMIT_DELAY_MS)
    },
    { flush: 'sync' },
  )
  onScopeDispose(() => clearTimeout(timer))

  /** Moves within the history of the component being edited, and stores where it now is. */
  const move = (change: (history: History) => void) => {
    clearTimeout(timer)
    if (!current.value) return
    change(current.value)
    storeIfLoaded(editingPrefabId.value)
  }

  return {
    commit,
    load,
    /** Stores the history of a component that was brought back after being deleted. */
    revive: async (prefabId: string, saved: Promise<SavedHistory | null>) => {
      // What this editor holds is newer than what was stored.
      if (histories.has(prefabId)) return store(prefabId)
      const history = await saved
      if (history) write(prefabId, history)
    },
    undo: () => move(history => history.undo()),
    redo: () => move(history => history.redo()),
    restoreVersion: (index: number) => move(history => history.restore(index)),
    canUndo: computed(() => !!current.value?.canUndo.value),
    canRedo: computed(() => !!current.value?.canRedo.value),
    versions: computed(() => current.value?.versions.value ?? []),
    pending: computed(() => !!current.value?.pending.value),
    /** The component being edited as it is now, to be put back if a group of changes fails. */
    snapshot: () =>
      editingPrefabId.value ? { id: editingPrefabId.value, data: serialize(editingPrefabId.value) } : null,
    restore: ({ id, data }: { id: string; data: string }) => apply(id, data),
  }
}
