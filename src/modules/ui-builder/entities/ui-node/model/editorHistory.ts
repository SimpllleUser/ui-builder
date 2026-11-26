import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { OUTSIDE_CHANGE_LABEL, useComponentHistory } from './componentHistory'
import { HISTORY_COMMIT_DELAY_MS, MAX_CHECKPOINTS, MAX_HISTORY_ENTRIES } from './constants'
import { useDeletedPrefabs } from './deletedPrefab'
import { createHistory, type HistoryEntry } from './history'
import { describeChange } from './historyLabels'
import { createNodeId } from './nodeUtils'
import type { ProjectStorage } from './persistence'
import type { usePrefabSync } from './prefabSync'
import type { DeletedPrefab, HistoryCheckpoint, Prefab, Project } from './types'

interface EditorHistorySources {
  project: Ref<Project>
  prefabs: Ref<Prefab[]>
  deletedPrefabs: Ref<DeletedPrefab[]>
  prefabSync: ReturnType<typeof usePrefabSync>
  editingPrefab: ComputedRef<Prefab | null>
  editingPrefabId: ComputedRef<string | null>
  /** Puts a snapshot of the project in the editor. */
  applySnapshot(snapshot: string): void
  /** Takes out of the selection what no longer exists. */
  pruneSelection(): void
  removePrefab(prefabId: string): void
  writeToStorage(task: (target: ProjectStorage) => Promise<unknown>): void
  setNotice(message: string, undoable?: boolean): void
}

/**
 * Taking changes back. The project has one history and each saved component its own; what Undo, Redo and the list
 * of versions act on is the one of what is being edited. A component deleted last can be brought back the same way.
 */
export function useEditorHistory(sources: EditorHistorySources) {
  const { project, prefabs, deletedPrefabs, prefabSync, editingPrefab, editingPrefabId } = sources
  const { applySnapshot, pruneSelection, removePrefab, writeToStorage, setNotice } = sources
  const checkpoints = ref<HistoryCheckpoint[]>([])
  let timer: ReturnType<typeof setTimeout> | undefined

  // Anything that was removed can be brought back from the message that says so.
  const offerUndo = (entry: HistoryEntry) => {
    // Something was edited since a component was deleted, so Undo takes that back now.
    if (entry.label !== OUTSIDE_CHANGE_LABEL) deletion.forget()
    if (/^(Deleted|Removed)/.test(entry.label)) setNotice(`${entry.label}.`, true)
  }
  const deletion = useDeletedPrefabs(prefabs, deletedPrefabs)
  const history = createHistory({
    serialize: () => JSON.stringify(project.value),
    applySnapshot,
    maxEntries: MAX_HISTORY_ENTRIES,
    describe: describeChange,
    onCommit: offerUndo,
  })
  // While a transaction runs, steps are not saved one by one: they become a single version at the end.
  let transactionDepth = 0
  const componentHistory = useComponentHistory({
    prefabs,
    editingPrefabId,
    read: prefabId => prefabSync.readHistory(prefabId),
    write: (prefabId, saved) => void prefabSync.writeHistory(prefabId, saved),
    isHeld: () => transactionDepth > 0,
    onCommit: offerUndo,
    onRestored: pruneSelection,
  })
  /** What the history being shown says: the component's while one is edited, otherwise the project's. */
  const shown = <T>(ofComponent: { readonly value: T }, ofProject: { readonly value: T }) =>
    computed(() => (editingPrefab.value ? ofComponent.value : ofProject.value))
  const shownCanUndo = shown(componentHistory.canUndo, history.canUndo)
  const canUndo = computed(() => !!deletion.undoableId.value || shownCanUndo.value)
  const shownCanRedo = shown(componentHistory.canRedo, history.canRedo)
  const canRedo = computed(() => !!deletion.redoableId.value || shownCanRedo.value)

  const commitProject = () => {
    clearTimeout(timer)
    if (transactionDepth === 0 && !history.isRestoring.value) history.commit()
  }
  const commit = () => {
    commitProject()
    componentHistory.commit()
  }
  /** Records the project a moment after it changed, so typing becomes one step and not one per letter. */
  const scheduleCommit = () => {
    if (history.isRestoring.value) return
    clearTimeout(timer)
    timer = setTimeout(commitProject, HISTORY_COMMIT_DELAY_MS)
  }
  /** Drops the record that is still to be made. */
  const cancelScheduled = () => clearTimeout(timer)
  /** Makes a change that follows from elsewhere, such as a component being updated: it is no step of its own. */
  const follow = (change: () => boolean) => {
    commitProject()
    if (change() && transactionDepth === 0) history.amend()
  }
  /** Starts over, for another project. */
  const reset = (nextCheckpoints: HistoryCheckpoint[]) => {
    checkpoints.value = [...nextCheckpoints]
    history.reset()
    deletion.forget()
  }
  /**
   * Runs several changes as one undo step. If one of them fails, everything it changed is put back and the error is passed on.
   * Used by agents (MCP) that build a page in many small steps.
   */
  const transaction = <T>(run: () => T): T => {
    if (transactionDepth > 0) return run()
    commit()
    const before = JSON.stringify(project.value)
    const componentBefore = componentHistory.snapshot()
    transactionDepth++
    try {
      return run()
    } catch (error) {
      if (componentBefore) componentHistory.restore(componentBefore)
      applySnapshot(before)
      throw error
    } finally {
      transactionDepth--
      commit()
    }
  }
  /**
   * Holds back history while something is dragged, so the whole drag is one undo step.
   * The returned function ends the gesture and records it.
   */
  const startGesture = () => {
    commit()
    transactionDepth++
    let ended = false
    return () => {
      if (ended) return
      ended = true
      transactionDepth--
      commit()
    }
  }
  const restorePrefab = (prefabId: string) => {
    // Changes not recorded yet come before the restoring.
    commit()
    const prefab = deletion.restore(prefabId)
    if (prefab) setNotice(`Restored ${prefab.name} to My components.`)
    return !!prefab
  }
  const deletePrefab = (prefabId: string) => {
    const name = prefabs.value.find(prefab => prefab.prefabId === prefabId)?.name
    if (name === undefined) return
    commit()
    deletion.remember(prefabId)
    removePrefab(prefabId)
    setNotice(`Deleted component ${name}.`, true)
  }
  const undo = () => {
    // Changes not recorded yet are newer than a deletion.
    if (deletion.undoableId.value) commit()
    const deletedId = deletion.undoableId.value
    if (deletedId && restorePrefab(deletedId)) {
      deletion.redoableId.value = deletedId
      return
    }
    if (editingPrefab.value) return componentHistory.undo()
    cancelScheduled()
    history.undo()
  }
  const redo = () => {
    if (deletion.redoableId.value) commit()
    const restoredId = deletion.redoableId.value
    if (restoredId) return deletePrefab(restoredId)
    if (editingPrefab.value) return componentHistory.redo()
    cancelScheduled()
    history.redo()
  }
  const restoreHistoryVersion = (index: number) => {
    if (editingPrefab.value) return componentHistory.restoreVersion(index)
    cancelScheduled()
    history.restore(index)
  }
  const createCheckpoint = (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return false
    commit()
    const checkpoint: HistoryCheckpoint = {
      checkpointId: createNodeId('checkpoint'),
      name: trimmedName,
      createdAt: Date.now(),
      snapshot: JSON.stringify(project.value),
    }
    const all = [checkpoint, ...checkpoints.value]
    checkpoints.value = all.slice(0, MAX_CHECKPOINTS)
    writeToStorage(target => target.saveCheckpoint(checkpoint))
    for (const dropped of all.slice(MAX_CHECKPOINTS)) {
      writeToStorage(target => target.deleteCheckpoint(dropped.checkpointId))
    }
    return true
  }
  const restoreCheckpoint = (checkpointId: string) => {
    const checkpoint = checkpoints.value.find(item => item.checkpointId === checkpointId)
    if (!checkpoint) return false
    cancelScheduled()
    try {
      history.restoreSnapshot(checkpoint.snapshot)
      return true
    } catch {
      setNotice('This checkpoint is invalid and could not be restored.')
      return false
    }
  }
  const deleteCheckpoint = (checkpointId: string) => {
    checkpoints.value = checkpoints.value.filter(item => item.checkpointId !== checkpointId)
    writeToStorage(target => target.deleteCheckpoint(checkpointId))
  }

  return {
    commit,
    scheduleCommit,
    cancelScheduled,
    follow,
    reset,
    transaction,
    startGesture,
    /** Records what the component being edited changed, so its history is complete when it is written. */
    commitComponent: componentHistory.commit,
    loadComponentHistory: componentHistory.load,
    canUndo,
    canRedo,
    versions: shown(componentHistory.versions, history.versions),
    pending: shown(componentHistory.pending, history.pending),
    checkpoints,
    undo,
    redo,
    restoreHistoryVersion,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    deletePrefab,
    restorePrefab,
  }
}
