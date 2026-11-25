import type { ProjectRepository } from '../api/projectRepository'
import { LegacyStorageKey } from '../config/database'
import type { NewProject, ProjectCheckpoint } from './types'

export const LEGACY_PROJECT_NAME = 'My project'

export type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>

// The theme key is not here: the theme module still keeps the theme in use under it.
const OBSOLETE_KEYS = [LegacyStorageKey.Document, LegacyStorageKey.Checkpoints, LegacyStorageKey.ActivePage]

const isCheckpoint = (value: unknown): value is ProjectCheckpoint =>
  typeof value === 'object' &&
  value !== null &&
  'checkpointId' in value &&
  typeof value.checkpointId === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'createdAt' in value &&
  typeof value.createdAt === 'number' &&
  'snapshot' in value &&
  typeof value.snapshot === 'string'

/** Unreadable checkpoints are left out; the old key is kept, so nothing is lost for good. */
function parseCheckpoints(text: string | null): ProjectCheckpoint[] {
  try {
    const value: unknown = JSON.parse(text ?? '[]')
    return Array.isArray(value) ? value.filter(isCheckpoint) : []
  } catch {
    return []
  }
}

function readLegacyProject(storage: LegacyStorage): NewProject | null {
  // The document is copied as it is, so even a damaged one is not lost.
  const document = storage.getItem(LegacyStorageKey.Document)
  if (document === null) return null
  return {
    name: LEGACY_PROJECT_NAME,
    document,
    preferences: {
      activePageId: storage.getItem(LegacyStorageKey.ActivePage),
      theme: storage.getItem(LegacyStorageKey.Theme),
    },
    checkpoints: parseCheckpoints(storage.getItem(LegacyStorageKey.Checkpoints)),
  }
}

/** Removes what has been moved, once a copy of it is safely written. */
async function retireLegacyKeys(repository: ProjectRepository, storage: LegacyStorage) {
  const left = OBSOLETE_KEYS.flatMap(key => {
    const value = storage.getItem(key)
    return value === null ? [] : [[key, value] as const]
  })
  if (!left.length) return
  await repository.keepBackup(Object.fromEntries(left))
  for (const [key] of left) storage.removeItem(key)
}

/** Moves the single project from `localStorage` into the repository. Safe to call on every start. */
export async function migrateLegacyProject(repository: ProjectRepository, storage: LegacyStorage) {
  const imported = await repository.importOnce(() => readLegacyProject(storage))
  await retireLegacyKeys(repository, storage)
  return imported
}
