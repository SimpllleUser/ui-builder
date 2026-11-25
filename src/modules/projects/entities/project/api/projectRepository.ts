import { openDatabase, requestResult, runTransaction, TransactionMode } from '../../../../../shared/lib/indexedDb'
import {
  CHECKPOINTS_BY_PROJECT,
  DATABASE_NAME,
  DATABASE_VERSION,
  LEGACY_IMPORTED_KEY,
  StoreName,
} from '../config/database'
import { projectNameError, uniqueProjectName } from '../model/projectName'
import type { NewProject, ProjectCheckpoint, ProjectMeta, ProjectPreferences } from '../model/types'

const EMPTY_PREFERENCES: ProjectPreferences = { activePageId: null, theme: null }
const PROJECT_STORES = [StoreName.Projects, StoreName.Documents, StoreName.Preferences, StoreName.Checkpoints]

function createStores(database: IDBDatabase) {
  database.createObjectStore(StoreName.Projects, { keyPath: 'id' })
  database.createObjectStore(StoreName.Documents)
  database.createObjectStore(StoreName.Preferences)
  database
    .createObjectStore(StoreName.Checkpoints, { keyPath: ['projectId', 'checkpointId'] })
    .createIndex(CHECKPOINTS_BY_PROJECT, 'projectId')
  database.createObjectStore(StoreName.Meta)
}

const allProjects = (transaction: IDBTransaction): Promise<ProjectMeta[]> =>
  requestResult(transaction.objectStore(StoreName.Projects).getAll())

/** Fails for a deleted project, so a late save (for example from another tab) cannot bring parts of it back. */
async function existingProject(transaction: IDBTransaction, id: string): Promise<ProjectMeta> {
  const project: ProjectMeta | undefined = await requestResult(transaction.objectStore(StoreName.Projects).get(id))
  if (!project) throw new Error('This project no longer exists.')
  return project
}

const readStoredPreferences = async (transaction: IDBTransaction, id: string): Promise<ProjectPreferences> => ({
  ...EMPTY_PREFERENCES,
  ...(await requestResult(transaction.objectStore(StoreName.Preferences).get(id))),
})

function writeProject(transaction: IDBTransaction, { name, document, preferences, checkpoints = [] }: NewProject) {
  const now = Date.now()
  const meta: ProjectMeta = { id: crypto.randomUUID(), name: name.trim(), createdAt: now, updatedAt: now }
  transaction.objectStore(StoreName.Projects).put(meta)
  transaction.objectStore(StoreName.Documents).put(document, meta.id)
  transaction.objectStore(StoreName.Preferences).put({ ...EMPTY_PREFERENCES, ...preferences }, meta.id)
  for (const checkpoint of checkpoints) {
    transaction.objectStore(StoreName.Checkpoints).put({ ...checkpoint, projectId: meta.id })
  }
  return meta
}

function checkName(projects: ProjectMeta[], name: string, ownId?: string) {
  const error = projectNameError(projects, name, ownId)
  if (error) throw new Error(error)
}

export async function openProjectRepository(factory: IDBFactory = indexedDB, databaseName = DATABASE_NAME) {
  const database = await openDatabase(factory, databaseName, DATABASE_VERSION, createStores)
  const read = <T>(stores: StoreName[], work: (transaction: IDBTransaction) => Promise<T>) =>
    runTransaction(database, stores, TransactionMode.Read, work)
  const write = <T>(stores: StoreName[], work: (transaction: IDBTransaction) => Promise<T>) =>
    runTransaction(database, stores, TransactionMode.Write, work)

  return {
    /** Most recently changed first. */
    listProjects: () =>
      read([StoreName.Projects], async transaction =>
        (await allProjects(transaction)).sort((a, b) => b.updatedAt - a.updatedAt),
      ),

    createProject: (project: NewProject) =>
      write(PROJECT_STORES, async transaction => {
        checkName(await allProjects(transaction), project.name)
        return writeProject(transaction, project)
      }),

    renameProject: (id: string, name: string) =>
      write([StoreName.Projects], async transaction => {
        const project = await existingProject(transaction, id)
        checkName(await allProjects(transaction), name, id)
        const renamed = { ...project, name: name.trim(), updatedAt: Date.now() }
        transaction.objectStore(StoreName.Projects).put(renamed)
        return renamed
      }),

    /** The copy gets the content and preferences, but starts without checkpoints. */
    duplicateProject: (id: string) =>
      write(PROJECT_STORES, async transaction => {
        const source = await existingProject(transaction, id)
        const document: string = await requestResult(transaction.objectStore(StoreName.Documents).get(id))
        const preferences = await readStoredPreferences(transaction, id)
        const name = uniqueProjectName(await allProjects(transaction), `${source.name} copy`)
        return writeProject(transaction, { name, document, preferences })
      }),

    deleteProject: (id: string) =>
      write(PROJECT_STORES, async transaction => {
        const checkpoints = transaction.objectStore(StoreName.Checkpoints)
        const keys = await requestResult(checkpoints.index(CHECKPOINTS_BY_PROJECT).getAllKeys(id))
        keys.forEach(key => checkpoints.delete(key))
        for (const store of [StoreName.Projects, StoreName.Documents, StoreName.Preferences]) {
          transaction.objectStore(store).delete(id)
        }
      }),

    readDocument: (id: string) =>
      read([StoreName.Documents], async transaction => {
        const document: string | undefined = await requestResult(transaction.objectStore(StoreName.Documents).get(id))
        return document ?? null
      }),

    saveDocument: (id: string, document: string) =>
      write([StoreName.Projects, StoreName.Documents], async transaction => {
        const project = await existingProject(transaction, id)
        transaction.objectStore(StoreName.Projects).put({ ...project, updatedAt: Date.now() })
        transaction.objectStore(StoreName.Documents).put(document, id)
      }),

    readPreferences: (id: string) =>
      read([StoreName.Preferences], transaction => readStoredPreferences(transaction, id)),

    updatePreferences: (id: string, patch: Partial<ProjectPreferences>) =>
      write([StoreName.Projects, StoreName.Preferences], async transaction => {
        await existingProject(transaction, id)
        const preferences = { ...(await readStoredPreferences(transaction, id)), ...patch }
        transaction.objectStore(StoreName.Preferences).put(preferences, id)
      }),

    /** Newest first. */
    listCheckpoints: (id: string) =>
      read([StoreName.Checkpoints], async transaction => {
        const index = transaction.objectStore(StoreName.Checkpoints).index(CHECKPOINTS_BY_PROJECT)
        const stored: (ProjectCheckpoint & { projectId: string })[] = await requestResult(index.getAll(id))
        return stored
          .map(({ projectId: _projectId, ...checkpoint }): ProjectCheckpoint => checkpoint)
          .sort((a, b) => b.createdAt - a.createdAt)
      }),

    saveCheckpoint: (id: string, checkpoint: ProjectCheckpoint) =>
      write([StoreName.Projects, StoreName.Checkpoints], async transaction => {
        await existingProject(transaction, id)
        transaction.objectStore(StoreName.Checkpoints).put({ ...checkpoint, projectId: id })
      }),

    deleteCheckpoint: (id: string, checkpointId: string) =>
      write([StoreName.Checkpoints], async transaction => {
        transaction.objectStore(StoreName.Checkpoints).delete([id, checkpointId])
      }),

    /**
     * Saves the project that existed before there were several, once. The mark is written in the same transaction,
     * so a failed import is tried again and a deleted imported project does not come back.
     * `load` returns null when there is nothing to import. Resolves with the new project, if one was made.
     */
    importOnce: (load: () => NewProject | null) =>
      write([...PROJECT_STORES, StoreName.Meta], async transaction => {
        const meta = transaction.objectStore(StoreName.Meta)
        if (await requestResult(meta.get(LEGACY_IMPORTED_KEY))) return null
        const legacy = load()
        meta.put(true, LEGACY_IMPORTED_KEY)
        if (!legacy) return null
        const name = uniqueProjectName(await allProjects(transaction), legacy.name)
        return writeProject(transaction, { ...legacy, name })
      }),

    close: () => database.close(),
  }
}

export type ProjectRepository = Awaited<ReturnType<typeof openProjectRepository>>
