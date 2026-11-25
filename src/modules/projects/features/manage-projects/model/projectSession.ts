import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import {
  countPages,
  emptyProjectDocument,
  normalizeDocument,
  SaveState,
  type OpenedProject,
  type ProjectStorage,
  type useUiTreeStore,
} from '../../../../ui-builder/entities/ui-node'
import {
  LEGACY_PROJECT_NAME,
  migrateLegacyProject,
  projectNameFromFile,
  uniqueProjectName,
  type LegacyStorage,
  type ProjectMeta,
  type ProjectRepository,
} from '../../../entities/project'

export const LAST_PROJECT_KEY = 'ui-builder:last-project'

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
}

/** Which project is open in this tab, and moving between projects without mixing them. */
export function createProjectSession({ repository, store, theme, browserStorage }: SessionSources) {
  const currentProjectId = ref<string | null>(null)
  /** Most recently changed first, as of the last `refresh`. */
  const projects = shallowRef<ProjectMeta[]>([])
  const currentProject = computed(() => projects.value.find(project => project.id === currentProjectId.value) ?? null)
  const refresh = async () => {
    projects.value = await repository.listProjects()
  }
  let latestRequest = 0

  const reportSaveFailure = () => store.setNotice('Could not save the theme of this project.')
  watch(
    theme,
    text => {
      const id = currentProjectId.value
      if (id) repository.updatePreferences(id, { theme: text }).catch(reportSaveFailure)
    },
    { flush: 'sync' },
  )

  const storageFor = (id: string): ProjectStorage => ({
    saveDocument: document => repository.saveDocument(id, document),
    saveActivePageId: activePageId => repository.updatePreferences(id, { activePageId }),
    saveCheckpoint: checkpoint => repository.saveCheckpoint(id, checkpoint),
    deleteCheckpoint: checkpointId => repository.deleteCheckpoint(id, checkpointId),
  })

  const allSaved = async () => {
    await store.flush()
    return store.saveState === SaveState.Saved
  }

  const rememberLast = (id: string) => {
    try {
      browserStorage.setItem(LAST_PROJECT_KEY, id)
    } catch {
      /* not remembered: the most recently changed project opens next time */
    }
  }

  const switchTo = async (id: string, canLeave: () => Promise<boolean>): Promise<boolean> => {
    const request = ++latestRequest
    if (id === currentProjectId.value) return true
    if (!(await canLeave())) return false
    const [document, preferences, checkpoints] = await Promise.all([
      repository.readDocument(id),
      repository.readPreferences(id),
      repository.listCheckpoints(id),
    ])
    // Changes made while reading are saved too before anything is replaced.
    if (!(await canLeave()) || request !== latestRequest) return false
    const opened: OpenedProject = {
      document: document ?? '',
      activePageId: preferences.activePageId,
      checkpoints,
      storage: storageFor(id),
    }
    try {
      store.openProject(opened)
    } catch {
      store.setNotice('Could not open a damaged project. Its saved copy has not been changed.')
      return false
    }
    currentProjectId.value = null
    theme.value = preferences.theme
    currentProjectId.value = id
    rememberLast(id)
    return true
  }

  /**
   * Resolves with false when the project was not opened: the current one could not be saved, a later request
   * replaced this one, or the document is damaged. A failure to read the repository rejects.
   */
  const open = (id: string) => switchTo(id, allSaved)

  const createEmptyProject = (name: string) => repository.createProject({ name, document: emptyProjectDocument() })
  const createDefaultProject = async () =>
    createEmptyProject(uniqueProjectName(await repository.listProjects(), LEGACY_PROJECT_NAME))

  /** Creates an empty project and opens it. A name that cannot be used rejects. */
  const create = async (name: string) => {
    if (!(await allSaved())) return false
    const created = await createEmptyProject(name)
    const opened = await open(created.id)
    await refresh()
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
    await refresh()
    return opened ? name : null
  }

  const rename = async (id: string, name: string) => {
    await repository.renameProject(id, name)
    await refresh()
  }

  const duplicate = async (id: string) => {
    // A copy of the open project must include what was just changed.
    if (id === currentProjectId.value && !(await allSaved())) return false
    await repository.duplicateProject(id)
    await refresh()
    return true
  }

  /** Leaves the open project without requiring it to be saved: it is about to be deleted. */
  const replaceCurrent = async (id: string) => {
    const leave = async () => true
    for (const project of await repository.listProjects()) {
      if (project.id !== id && (await switchTo(project.id, leave))) return
    }
    await switchTo((await createDefaultProject()).id, leave)
  }

  /** Deleting the open project opens another one first, a new empty one when there is none. */
  const remove = async (id: string) => {
    if (id === currentProjectId.value) {
      await replaceCurrent(id)
      if (id === currentProjectId.value) return false
      // Writes still going to the project being deleted finish before it goes.
      await store.flush()
    }
    await repository.deleteProject(id)
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
    const lastId = browserStorage.getItem(LAST_PROJECT_KEY)
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
