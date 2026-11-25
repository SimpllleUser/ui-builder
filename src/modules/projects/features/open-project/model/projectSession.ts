import { ref, watch, type Ref } from 'vue'
import {
  emptyProjectDocument,
  SaveState,
  type OpenedProject,
  type ProjectStorage,
  type useUiTreeStore,
} from '../../../../ui-builder/entities/ui-node'
import {
  LEGACY_PROJECT_NAME,
  migrateLegacyProject,
  uniqueProjectName,
  type LegacyStorage,
  type ProjectMeta,
  type ProjectRepository,
} from '../../../entities/project'

export const LAST_PROJECT_KEY = 'ui-builder:last-project'

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

  /**
   * Resolves with false when the project was not opened: the current one could not be saved, a later request
   * replaced this one, or the document is damaged. A failure to read the repository rejects.
   */
  const open = async (id: string): Promise<boolean> => {
    const request = ++latestRequest
    if (id === currentProjectId.value) return true
    if (!(await allSaved())) return false
    const [document, preferences, checkpoints] = await Promise.all([
      repository.readDocument(id),
      repository.readPreferences(id),
      repository.listCheckpoints(id),
    ])
    // Changes made while reading are saved too before anything is replaced.
    if (!(await allSaved()) || request !== latestRequest) return false
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

  const createFirstProject = (projects: ProjectMeta[]) =>
    repository.createProject({
      name: uniqueProjectName(projects, LEGACY_PROJECT_NAME),
      document: emptyProjectDocument(),
    })

  /** Opens the project used last, moving the old single project over first. */
  const start = async () => {
    await migrateLegacyProject(repository, browserStorage)
    const projects = await repository.listProjects()
    const lastId = browserStorage.getItem(LAST_PROJECT_KEY)
    const lastFirst = [...projects].sort((a, b) => Number(b.id === lastId) - Number(a.id === lastId))
    for (const project of lastFirst) {
      if (await open(project.id)) return
    }
    const created = await createFirstProject(projects)
    if (!(await open(created.id))) throw new Error('Could not open a new project.')
  }

  return { currentProjectId, open, start }
}

export type ProjectSession = ReturnType<typeof createProjectSession>
