import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import {
  countPages,
  emptyProjectDocument,
  normalizeDocument,
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
  projectNameFromFile,
  uniqueProjectName,
  type LegacyStorage,
  type ProjectMeta,
  type ProjectRepository,
} from '../../../entities/project'
import { ProjectEvent, type ProjectChannel, type ProjectMessage } from './projectChannel'

export const LAST_PROJECT_KEY = 'ui-builder:last-project'

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
}

/** Which project is open in this tab, and moving between projects without mixing them. */
export function createProjectSession(sources: SessionSources) {
  const { repository, store, theme, browserStorage, tabStorage, channel } = sources
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
  let latestRequest = 0
  /** Grows each time a project is put in the editor. */
  const openCount = ref(0)

  const reportSaveFailure = () => store.setNotice('Could not save the theme of this project.')
  watch(
    theme,
    text => {
      const id = currentProjectId.value
      if (id) repository.updatePreferences(id, { theme: text }).catch(reportSaveFailure)
    },
    { flush: 'sync' },
  )

  const reject = (reason: ProjectConflict) => {
    conflict.value = reason
    return new SaveRejectedError(CONFLICT_MESSAGES[reason])
  }

  const storageFor = (id: string, revision: number): ProjectStorage => {
    let baseRevision = revision
    return {
      saveDocument: async document => {
        try {
          baseRevision = await repository.saveDocument(id, document, baseRevision)
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
      saveActivePageId: activePageId => repository.updatePreferences(id, { activePageId }),
      saveCheckpoint: checkpoint => repository.saveCheckpoint(id, checkpoint),
      deleteCheckpoint: checkpointId => repository.deleteCheckpoint(id, checkpointId),
    }
  }

  const onMessage = ({ event, id, revision = 0 }: ProjectMessage) => {
    if (id === currentProjectId.value) {
      if (event === ProjectEvent.Removed) conflict.value = ProjectConflict.Deleted
      if (event === ProjectEvent.Saved && revision > knownRevision) conflict.value = ProjectConflict.Changed
    }
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
  const load = async (id: string, { canLeave, unsaved }: Departure): Promise<boolean> => {
    const request = ++latestRequest
    if (!(await canLeave())) return false
    const [content, preferences, checkpoints] = await Promise.all([
      repository.readContent(id),
      repository.readPreferences(id),
      repository.listCheckpoints(id),
    ])
    // Changes made while reading are saved too before anything is replaced.
    if (!(await canLeave()) || request !== latestRequest) return false
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
      return false
    }
    currentProjectId.value = null
    theme.value = preferences.theme
    knownRevision = content.revision
    conflict.value = null
    currentProjectId.value = id
    openCount.value++
    rememberLast(id)
    return true
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

  /**
   * Adds the file's content as a new project and opens it. An invalid document rejects and creates nothing.
   * Resolves with the name given to the project, or null when the open one could not be saved first.
   */
  const importProject = async (fileName: string, text: string) => {
    const document = normalizeDocument(text)
    if (!(await allSaved())) return null
    const name = uniqueProjectName(await repository.listProjects(), projectNameFromFile(fileName))
    const created = await repository.createProject({ name, document })
    const opened = await open(created.id)
    await announce(created.id)
    return opened ? name : null
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

  /** Deleting the open project opens another one first, a new empty one when there is none. */
  const remove = async (id: string) => {
    if (id === currentProjectId.value) {
      // What is not saved yet is still written, in case the delete does not go through.
      await store.flush()
      await replaceCurrent()
      if (id === currentProjectId.value) return false
      // Writes still going to the project being deleted finish before it goes.
      await store.flush()
    }
    await repository.deleteProject(id)
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

  /** The saved text of a project, also of a damaged one, so it can always be taken out. */
  const readDocument = async (id: string) =>
    id === currentProjectId.value ? store.exportDocument() : ((await repository.readDocument(id)) ?? '')

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

  return {
    currentProjectId,
    currentProject,
    projects,
    conflict,
    openCount,
    reloadCurrent,
    saveAsCopy,
    leaveDeleted: replaceCurrent,
    refresh,
    listDetails,
    readDocument,
    open,
    create,
    importProject,
    rename,
    duplicate,
    remove,
    start,
  }
}

export type ProjectSession = ReturnType<typeof createProjectSession>
