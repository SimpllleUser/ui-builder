import type { HistoryCheckpoint } from './types'

/** Thrown by a storage that refuses to write. The message is shown to the person as it is. */
export class SaveRejectedError extends Error {}

/** What happens to changes not yet written when another project replaces the open one. */
export enum UnsavedChanges {
  Write = 'write',
  Discard = 'discard',
}

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
