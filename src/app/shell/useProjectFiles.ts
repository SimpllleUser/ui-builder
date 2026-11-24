import { downloadTextFile } from '../../shared/lib/downloadTextFile'
import { type useUiTreeStore } from '../../modules/ui-builder/entities/ui-node'

const MAX_IMPORT_BYTES = 5_000_000
const EXPORT_FILE_NAME = 'ui-builder-project.json'

/** Saving the project as a JSON file and restoring it from one. */
export function useProjectFiles(store: ReturnType<typeof useUiTreeStore>) {
  const exportProject = () => downloadTextFile(EXPORT_FILE_NAME, store.exportDocument(), 'application/json')

  /** Handles the file chosen in an `<input type="file">`. */
  const importFromInput = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a document smaller than 5 MB.')
      store.importDocument(await file.text())
    } catch (error) {
      store.setNotice(error instanceof Error ? error.message : 'Could not import this document.')
    }
    input.value = ''
  }

  return { exportProject, importFromInput }
}
