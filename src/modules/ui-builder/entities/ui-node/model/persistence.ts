import type { HistoryCheckpoint } from './types'

/** Where the open project is written. The store does not know what is behind it. */
export interface ProjectStorage {
  saveDocument(document: string): Promise<unknown>
  saveActivePageId(id: string): Promise<unknown>
  saveCheckpoint(checkpoint: HistoryCheckpoint): Promise<unknown>
  deleteCheckpoint(checkpointId: string): Promise<unknown>
}

export interface OpenedProject {
  /** The serialized document, as it was saved. */
  document: string
  activePageId: string | null
  /** Newest first. */
  checkpoints: HistoryCheckpoint[]
  storage: ProjectStorage
}
