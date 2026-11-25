import { downloadTextFile } from '../../shared/lib/downloadTextFile'
import { type useUiTreeStore } from '../../modules/ui-builder/entities/ui-node'
import { projectFileName } from '../../modules/projects/entities/project'
import { type ProjectSession } from '../../modules/projects/features/manage-projects'

const MAX_IMPORT_BYTES = 5_000_000

/** Saving the open project as a JSON file, and adding a project from one. */
export function useProjectFiles(store: ReturnType<typeof useUiTreeStore>, session: ProjectSession) {
  const exportProject = () => {
    const fileName = projectFileName(session.currentProject.value?.name ?? '')
    downloadTextFile(fileName, store.exportDocument(), 'application/json')
  }

  /** Handles the file chosen in an `<input type="file">`. */
  const importFromInput = async ({ target }: Event) => {
    if (!(target instanceof HTMLInputElement)) return
    const file = target.files?.[0]
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a document smaller than 5 MB.')
      const name = await session.importProject(file.name, await file.text())
      if (name) store.setNotice(`Imported “${name}” as a new project.`)
    } catch (error) {
      store.setNotice(error instanceof Error ? error.message : 'Could not import this document.')
    }
    // So choosing the same file again is noticed.
    target.value = ''
  }

  return { exportProject, importFromInput }
}
