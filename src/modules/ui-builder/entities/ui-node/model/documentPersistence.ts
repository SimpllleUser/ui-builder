import { ref } from 'vue'
import { SaveState } from './enums'
import { SaveRejectedError, UnsavedChanges, type ProjectStorage } from './persistence'

const SAVE_DELAY_MS = 250

/** Writing the open project: when it happens, in what order, and whether it succeeded. */
export function useDocumentPersistence(serialize: () => string, onError: (message: string) => void) {
  const saveState = ref<SaveState>(SaveState.Saved)
  /** Null until a project is opened: changes then stay in memory. */
  let storage: ProjectStorage | null = null
  /** Counts changes, so a finished write knows whether it was the latest one. */
  let revision = 0
  /** Writes run one after another, in the order they were asked for. */
  let writes: Promise<void> = Promise.resolve()
  let timer: ReturnType<typeof setTimeout> | undefined

  const enqueue = (write: () => Promise<unknown>) => {
    writes = writes.then(async () => {
      try {
        await write()
      } catch (error) {
        saveState.value = SaveState.Error
        onError(
          error instanceof SaveRejectedError
            ? error.message
            : 'Could not save in this browser. Export your page to keep a backup.',
        )
      }
    })
    return writes
  }

  /** Writes something besides the document to the open project's storage. */
  const write = (task: (target: ProjectStorage) => Promise<unknown>) => {
    const target = storage
    if (target) enqueue(() => task(target))
  }

  const save = () => {
    clearTimeout(timer)
    const target = storage
    if (!target) {
      saveState.value = SaveState.Saved
      return writes
    }
    // Taken now, not when the write runs: by then another project may be open.
    const document = serialize()
    const savedRevision = revision
    return enqueue(async () => {
      await target.saveDocument(document)
      if (savedRevision === revision) saveState.value = SaveState.Saved
    })
  }

  /** Resolves when everything changed so far has been written, or has failed to be (see `saveState`). */
  const flush = () => (saveState.value === SaveState.Saved ? writes : save())

  const markChanged = () => {
    revision++
    saveState.value = SaveState.Saving
    clearTimeout(timer)
    timer = setTimeout(save, SAVE_DELAY_MS)
  }

  /** Moves on to another project's storage. Call it while `serialize` still gives the project being left. */
  const connect = (next: ProjectStorage, unsaved: UnsavedChanges) => {
    if (unsaved === UnsavedChanges.Write && saveState.value !== SaveState.Saved) save()
    clearTimeout(timer)
    revision++
    storage = next
    saveState.value = SaveState.Saved
  }

  const stop = () => clearTimeout(timer)

  return { saveState, write, save, flush, markChanged, connect, stop }
}
