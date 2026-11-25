import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import {
  countPages,
  emptyProjectDocument,
  SaveRejectedError,
  SaveState,
  UnsavedChanges,
  type OpenedProject,
  type ProjectStorage,
  type useUiTreeStore,
} from '../../../../ui-builder/entities/ui-node'
import {
  LEGACY_PROJECT_NAME,
  migrateLegacyProject,
  ProjectChangedError,
  ProjectMissingError,
  uniqueProjectName,
  type LegacyStorage,
  type ProjectMeta,
  type ProjectRepository,
} from '../../../entities/project'
import type { TabLocks } from '../../../../../shared/lib/webLocks'
import { createProjectBackups } from './projectBackups'
import { createProjectOwnership, Takeover } from './projectOwnership'
import { ProjectEvent, type ProjectChannel, type ProjectMessage } from './projectChannel'

export const LAST_PROJECT_KEY = 'ui-builder:last-project'
const LOCKED_MESSAGE = 'Not saved: this project is being edited in another tab.'
/** Why the open project can no longer be saved as it is. */
export enum ProjectConflict {
  Changed = 'changed',
  Deleted = 'deleted',
}

const CONFLICT_MESSAGES: Record<ProjectConflict, string> = {
  [ProjectConflict.Changed]: 'Not saved: this project was changed in another tab.',
  [ProjectConflict.Deleted]: 'Not saved: this project was deleted in another tab.',
}

interface Departure {
  canLeave(): Promise<boolean>
  unsaved: UnsavedChanges
}

export interface ProjectDetails extends ProjectMeta {
  /** Null when the saved document is damaged. */
  pageCount: number | null
}

interface SessionSources {
  repository: ProjectRepository
  store: ReturnType<typeof useUiTreeStore>
  /** The theme in use, as saved text. Writing null means the default theme. */
  theme: Ref<string, string | null>
  browserStorage: LegacyStorage & Pick<Storage, 'setItem'>
  /** Lives as long as the tab, so each tab reopens its own project. */
  tabStorage: Pick<Storage, 'getItem' | 'setItem'>
  channel: ProjectChannel
  locks: TabLocks
}

/** Which project is open in this tab, and moving between projects without mixing them. */
export function createProjectSession(sources: SessionSources) {
  const { repository, store, theme, browserStorage, tabStorage, channel, locks } = sources
  const currentProjectId = ref<string | null>(null)
  /** Most recently changed first, as of the last `refresh`. */
  const projects = shallowRef<ProjectMeta[]>([])
  const currentProject = computed(() => projects.value.find(project => project.id === currentProjectId.value) ?? null)
  const refresh = async () => {
    projects.value = await repository.listProjects()
  }
  const conflict = ref<ProjectConflict | null>(null)
  /** The revision of the open document that this tab has read or written last. */
  let knownRevision = 0
  /** True while another tab edits the open project: the editor is then not shown. */
  const isLocked = ref(false)
  const ownership = createProjectOwnership(locks, () => {
    isLocked.value = true
  })
  const { holds } = ownership
  let latestRequest = 0
  /** Grows each time a project is put in the editor. */
  const openCount = ref(0)

  const reportSaveFailure = () => store.setNotice('Could not save the theme of this project.')
  watch(
    theme,
    text => {
      const id = currentProjectId.value
      if (id && holds(id)) repository.updatePreferences(id, { theme: text }).catch(reportSaveFailure)
    },
    { flush: 'sync' },
  )

  const reject = (reason: ProjectConflict) => {
    conflict.value = reason
    return new SaveRejectedError(CONFLICT_MESSAGES[reason])
  }

  /** Only the tab holding the project's lock writes to it. */
  const asOwner = <T>(id: string, write: () => Promise<T>) => {
    if (!holds(id)) return Promise.reject(new SaveRejectedError(LOCKED_MESSAGE))
    return write()
  }

  const storageFor = (id: string, revision: number): ProjectStorage => {
    let baseRevision = revision
    return {
      saveDocument: async document => {
        try {
          baseRevision = await asOwner(id, () => repository.saveDocument(id, document, baseRevision))
        } catch (error) {
          // A project already left must not mark the open one as conflicting.
          if (id !== currentProjectId.value) throw error
          if (error instanceof ProjectChangedError) throw reject(ProjectConflict.Changed)
          if (error instanceof ProjectMissingError) throw reject(ProjectConflict.Deleted)
          throw error
        }
        if (id === currentProjectId.value) knownRevision = baseRevision
        channel.post({ event: ProjectEvent.Saved, id, revision: baseRevision })
      },
      saveActivePageId: activePageId => asOwner(id, () => repository.updatePreferences(id, { activePageId })),
      saveCheckpoint: checkpoint => asOwner(id, () => repository.saveCheckpoint(id, checkpoint)),
      deleteCheckpoint: checkpointId => asOwner(id, () => repository.deleteCheckpoint(id, checkpointId)),
    }
  }

  /** Saves what is here and lets the asking tab have the project. Keeps it when saving fails. */
  const handOver = async (id: string) => {
    // Locked first, so nothing more is changed while the last write runs.
    isLocked.value = true
    // So that the other tab can edit saved components too.
    store.stopEditingPrefab()
    await store.flush()
    if (!holds(id)) return
    if (store.saveState === SaveState.Saved) ownership.release()
    else isLocked.value = false
  }

  /** Shows what the editing tab has saved since. Nothing is written and no lock is asked for. */
  const refreshView = async (id: string) => {
    const [content, preferences, checkpoints] = await Promise.all([
      repository.readContent(id),
      repository.readPreferences(id),
      repository.listCheckpoints(id),
    ])
    // Unsaved changes left by a forced takeover stay on screen until the person decides about them.
    if (id !== currentProjectId.value || !isLocked.value || store.saveState !== SaveState.Saved) return
    const opened: OpenedProject = {
      document: content.document,
      activePageId: store.activePageId,
      checkpoints,
      storage: storageFor(id, content.revision),
    }
    store.openProject(opened, UnsavedChanges.Discard)
    theme.value = preferences.theme
    knownRevision = content.revision
    openCount.value++
  }

  const onMessage = ({ event, id, revision = 0 }: ProjectMessage) => {
    if (id === currentProjectId.value) {
      if (event === ProjectEvent.ReleaseRequested && holds(id)) handOver(id)
      if (event === ProjectEvent.Removed) conflict.value = ProjectConflict.Deleted
      if (event === ProjectEvent.Saved && holds(id) && revision > knownRevision) {
        conflict.value = ProjectConflict.Changed
      }
      if (event === ProjectEvent.Saved && isLocked.value && !holds(id)) {
        refreshView(id).catch(() => {
          /* the view stays as it was; taking over reads the project again */
        })
      }
    }
    if (event === ProjectEvent.ReleaseRequested) return
    refresh().catch(() => {
      /* the list is read again the next time it is shown */
    })
  }
  channel.subscribe(onMessage)

  const allSaved = async () => {
    await store.flush()
    return store.saveState === SaveState.Saved
  }

  const rememberLast = (id: string) => {
    for (const storage of [tabStorage, browserStorage]) {
      try {
        storage.setItem(LAST_PROJECT_KEY, id)
      } catch {
        /* not remembered: another project may open next time */
      }
    }
  }

  /** Reads a project and puts it in the editor, also when it is the one already open. */
  const replaceOpenProject = async (id: string, request: number, { canLeave, unsaved }: Departure) => {
    if (!(await canLeave())) return false
    // The lock comes first, so what is read already includes the last write of its previous holder.
    const claim = await ownership.claim(id)
    const giveBack = () => {
      claim.giveBack()
      return false
    }
    try {
      const [content, preferences, checkpoints] = await Promise.all([
        repository.readContent(id),
        repository.readPreferences(id),
        repository.listCheckpoints(id),
      ])
      // Changes made while reading are saved too before anything is replaced.
      if (!(await canLeave()) || request !== latestRequest) return giveBack()
      const opened: OpenedProject = {
        document: content.document,
        activePageId: preferences.activePageId,
        checkpoints,
        storage: storageFor(id, content.revision),
      }
      try {
        store.openProject(opened, unsaved)
      } catch {
        store.setNotice('Could not open a damaged project. Its saved copy has not been changed.')
        return giveBack()
      }
      claim.keep()
      currentProjectId.value = null
      theme.value = preferences.theme
      knownRevision = content.revision
      conflict.value = null
      isLocked.value = !claim.owned
      currentProjectId.value = id
      openCount.value++
      rememberLast(id)
      return true
    } catch (error) {
      giveBack()
      throw error
    }
  }

  /** Projects are loaded one at a time, so a tab never competes with itself for a lock. */
  let loading: Promise<unknown> = Promise.resolve()
  const load = (id: string, departure: Departure) => {
    const request = ++latestRequest
    const result = loading.then(() => (request === latestRequest ? replaceOpenProject(id, request, departure) : false))
    loading = result.catch(() => {})
    return result
  }

  const keepingChanges: Departure = { canLeave: allSaved, unsaved: UnsavedChanges.Write }
  const droppingChanges: Departure = { canLeave: async () => true, unsaved: UnsavedChanges.Discard }

  const switchTo = async (id: string, departure: Departure) => {
    if (id !== currentProjectId.value) return load(id, departure)
    // Asking for the open project cancels a switch still on its way.
    latestRequest++
    return true
  }

  /**
   * Resolves with false when the project was not opened: the current one could not be saved, a later request
   * replaced this one, or the document is damaged. A failure to read the repository rejects.
   */
  const open = (id: string) => switchTo(id, keepingChanges)

  const createEmptyProject = (name: string) => repository.createProject({ name, document: emptyProjectDocument() })
  const announce = async (id: string) => {
    channel.post({ event: ProjectEvent.ListChanged, id })
    await refresh()
  }
  const createDefaultProject = async () =>
    createEmptyProject(uniqueProjectName(await repository.listProjects(), LEGACY_PROJECT_NAME))

  /** Creates an empty project and opens it. A name that cannot be used rejects. */
  const create = async (name: string) => {
    if (!(await allSaved())) return false
    const created = await createEmptyProject(name)
    const opened = await open(created.id)
    await announce(created.id)
    return opened
  }

  const rename = async (id: string, name: string) => {
    await repository.renameProject(id, name)
    await announce(id)
  }

  const duplicate = async (id: string) => {
    // A copy of the open project must include what was just changed.
    if (id === currentProjectId.value && !(await allSaved())) return false
    const copy = await repository.duplicateProject(id)
    await announce(copy.id)
    return true
  }

  /** Leaves the open project without saving it: it is being deleted, or already was. */
  const replaceCurrent = async () => {
    const leftId = currentProjectId.value
    for (const project of await repository.listProjects()) {
      if (project.id !== leftId && (await switchTo(project.id, droppingChanges))) return
    }
    await switchTo((await createDefaultProject()).id, droppingChanges)
  }

  /** Gives up this tab's unsaved changes and takes what is saved now. */
  const reloadCurrent = async () => {
    const id = currentProjectId.value
    return id ? load(id, droppingChanges) : false
  }

  /** Takes the open project over from the tab editing it. Resolves with false when that tab did not let go. */
  const editHere = async (takeover = Takeover.Ask) => {
    const id = currentProjectId.value
    if (!id) return false
    if (holds(id)) return true
    channel.post({ event: ProjectEvent.ReleaseRequested, id })
    const claim = await ownership.takeOver(id, takeover)
    if (!claim.owned) return false
    if (id !== currentProjectId.value) {
      claim.giveBack()
      return false
    }
    claim.keep()
    const loaded = await load(id, droppingChanges)
    if (!loaded && isLocked.value) ownership.release()
    return loaded
  }

  /** Keeps what this tab shows as a new project, whatever happened to the original. */
  const saveAsCopy = async () => {
    const document = store.exportDocument()
    const name = uniqueProjectName(
      await repository.listProjects(),
      `${currentProject.value?.name ?? LEGACY_PROJECT_NAME} copy`,
    )
    const created = await repository.createProject({ name, document, preferences: { theme: theme.value } })
    const opened = await switchTo(created.id, droppingChanges)
    await announce(created.id)
    return opened
  }

  const openElsewhere = () => new Error('This project is open in another tab. Close it there first.')

  /** Deleting the open project opens another one first, a new empty one when there is none. */
  const remove = async (id: string) => {
    if (id === currentProjectId.value) {
      if (!holds(id) && conflict.value !== ProjectConflict.Deleted) throw openElsewhere()
      // What is not saved yet is still written, in case the delete does not go through.
      await store.flush()
      await replaceCurrent()
      if (id === currentProjectId.value) return false
      // Writes still going to the project being deleted finish before it goes.
      await store.flush()
    }
    if (!(await ownership.whileFree(id, () => repository.deleteProject(id)))) throw openElsewhere()
    channel.post({ event: ProjectEvent.Removed, id })
    await refresh()
    return true
  }

  const listDetails = async (): Promise<ProjectDetails[]> => {
    await refresh()
    return Promise.all(
      projects.value.map(async project => ({
        ...project,
        pageCount: countPages((await repository.readDocument(project.id)) ?? ''),
      })),
    )
  }

  /** Opens the project used last, moving the old single project over first. */
  const start = async () => {
    await migrateLegacyProject(repository, browserStorage)
    const saved = await repository.listProjects()
    const lastId = tabStorage.getItem(LAST_PROJECT_KEY) ?? browserStorage.getItem(LAST_PROJECT_KEY)
    const lastFirst = [...saved].sort((a, b) => Number(b.id === lastId) - Number(a.id === lastId))
    for (const project of lastFirst) {
      if (await open(project.id)) return refresh()
    }
    const created = await createDefaultProject()
    if (!(await open(created.id))) throw new Error('Could not open a new project.')
    await refresh()
  }

  const backups = createProjectBackups({
    repository,
    store,
    theme,
    currentProjectId,
    allSaved,
    open,
    announce,
  })

  return {
    ...backups,
    currentProjectId,
    currentProject,
    projects,
    conflict,
    openCount,
    isLocked,
    editHere,
    reloadCurrent,
    saveAsCopy,
    leaveDeleted: replaceCurrent,
    refresh,
    listDetails,
    open,
    create,
    rename,
    duplicate,
    remove,
    start,
  }
}

export type ProjectSession = ReturnType<typeof createProjectSession>
