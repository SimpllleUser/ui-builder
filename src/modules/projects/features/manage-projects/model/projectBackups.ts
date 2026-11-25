import type { Ref } from 'vue'
import { normalizeDocument, type useUiTreeStore } from '../../../../ui-builder/entities/ui-node'
import { projectNameFromFile, uniqueProjectName, type ProjectRepository } from '../../../entities/project'
import { themeOfProjectFile, toProjectFile } from './projectFile'

interface BackupSources {
  repository: ProjectRepository
  store: ReturnType<typeof useUiTreeStore>
  theme: Ref<string, string | null>
  currentProjectId: Ref<string | null>
  allSaved(): Promise<boolean>
  open(id: string): Promise<boolean>
  announce(id: string): Promise<void>
}

/** Taking a project out as a file and bringing one in. */
export function createProjectBackups(sources: BackupSources) {
  const { repository, store, theme, currentProjectId, allSaved, open, announce } = sources

  /**
   * Adds the file's content as a new project and opens it. An invalid document rejects and creates nothing.
   * Resolves with the name given to the project, or null when the open one could not be saved first.
   */
  const importProject = async (fileName: string, text: string) => {
    const document = normalizeDocument(text)
    if (!(await allSaved())) return null
    const name = uniqueProjectName(await repository.listProjects(), projectNameFromFile(fileName))
    const preferences = { theme: themeOfProjectFile(text) }
    const created = await repository.createProject({ name, document, preferences })
    const opened = await open(created.id)
    await announce(created.id)
    return opened ? name : null
  }

  /** The content of a project's backup file. A damaged project gives its saved text, so it can be taken out. */
  const exportFile = async (id: string) => {
    if (id === currentProjectId.value) return toProjectFile(store.exportDocument(), theme.value)
    const [document, preferences] = await Promise.all([repository.readDocument(id), repository.readPreferences(id)])
    return toProjectFile(document ?? '', preferences.theme)
  }

  /** Applies the theme a file carries to the open project; a file without one leaves the theme as it is. */
  const applyFileTheme = (text: string) => {
    const carried = themeOfProjectFile(text)
    if (carried) theme.value = carried
  }

  return { importProject, exportFile, applyFileTheme }
}
