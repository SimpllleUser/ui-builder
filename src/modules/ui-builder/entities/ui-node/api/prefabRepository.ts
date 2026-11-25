import { openDatabase, requestResult, runTransaction, TransactionMode } from '../../../../../shared/lib/indexedDb'
import { createTabLocks, type TabLocks } from '../../../../../shared/lib/webLocks'
import { MAX_DELETED_PREFABS } from '../model/constants'
import { isSavedHistory, type SavedHistory } from '../model/history'
import type { PrefabLibrary } from '../model/prefabSync'
import type { DeletedPrefab, Prefab } from '../model/types'

// A database of its own: the library belongs to no project, and its schema changes on its own.
const DATABASE_NAME = 'ui-builder-library'
const DATABASE_VERSION = 1
const CHANNEL_NAME = 'ui-builder:prefabs'
const HISTORY_PREFIX = 'history:'
const DELETED_PREFIX = 'deleted:'
const LEGACY_IMPORTED_KEY = 'legacy-imported'
const LEGACY_BACKUP_PREFIX = 'legacy-backup:'
export const LEGACY_PREFABS_KEY = 'ui-builder:prefabs'

enum StoreName {
  Prefabs = 'prefabs',
  Meta = 'meta',
}

interface PrefabRecord {
  prefab: Prefab
  /** Where it stands in the list: the order in which the components were saved. */
  order: number
}

/** A removed component, with what is needed to put it back as it was. */
interface DeletedRecord extends DeletedPrefab {
  order: number
  history?: SavedHistory
}

/** How tabs tell each other the library changed. A tab does not receive its own messages. */
export interface LibraryChannel {
  post(): void
  subscribe(listener: () => void): void
}

function openLibraryChannel(): LibraryChannel {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  return {
    post: () => channel.postMessage(null),
    subscribe: listener => channel.addEventListener('message', () => listener()),
  }
}

const isPrefab = (value: unknown): value is Prefab =>
  typeof value === 'object' &&
  value !== null &&
  'prefabId' in value &&
  typeof value.prefabId === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'node' in value &&
  typeof value.node === 'object' &&
  value.node !== null

function readLegacyPrefabs(text: string | null): Prefab[] {
  try {
    const value: unknown = JSON.parse(text ?? '[]')
    return Array.isArray(value) ? value.filter(isPrefab) : []
  } catch {
    return []
  }
}

const createStores = (database: IDBDatabase) => {
  database.createObjectStore(StoreName.Prefabs)
  database.createObjectStore(StoreName.Meta)
}

const allRecords = (transaction: IDBTransaction): Promise<PrefabRecord[]> =>
  requestResult(transaction.objectStore(StoreName.Prefabs).getAll())

interface RepositorySources {
  factory?: IDBFactory
  channel?: LibraryChannel
  /** Where the library lived before, to be moved over once. */
  legacyStorage?: Pick<Storage, 'getItem' | 'removeItem'>
  locks?: TabLocks
}

const isDeletedRecord = (value: unknown): value is DeletedRecord =>
  typeof value === 'object' &&
  value !== null &&
  'prefab' in value &&
  isPrefab(value.prefab) &&
  'order' in value &&
  typeof value.order === 'number' &&
  'index' in value &&
  typeof value.index === 'number' &&
  'deletedAt' in value &&
  typeof value.deletedAt === 'number'

/** The removed components, newest first. */
async function deletedRecords(transaction: IDBTransaction): Promise<DeletedRecord[]> {
  const meta = transaction.objectStore(StoreName.Meta)
  // Only these are read: the store also holds histories, which can be large.
  const keys = (await requestResult(meta.getAllKeys())).filter(key => String(key).startsWith(DELETED_PREFIX))
  const values: unknown[] = await Promise.all(keys.map(key => requestResult(meta.get(key))))
  return values.filter(isDeletedRecord).sort((a, b) => b.deletedAt - a.deletedAt)
}

/** Writes a component. One that was removed before comes back to its place, with its history. */
async function putPrefab(transaction: IDBTransaction, prefab: Prefab) {
  const meta = transaction.objectStore(StoreName.Meta)
  const records = await allRecords(transaction)
  const deleted = await deletedRecords(transaction)
  const existing = records.find(record => record.prefab.prefabId === prefab.prefabId)
  const removed = deleted.find(record => record.prefab.prefabId === prefab.prefabId)
  const nextOrder = Math.max(-1, ...[...records, ...deleted].map(record => record.order)) + 1
  const order = existing?.order ?? removed?.order ?? nextOrder
  transaction.objectStore(StoreName.Prefabs).put({ prefab, order }, prefab.prefabId)
  if (!removed) return
  if (removed.history) meta.put(removed.history, `${HISTORY_PREFIX}${prefab.prefabId}`)
  meta.delete(`${DELETED_PREFIX}${prefab.prefabId}`)
}

/** Moves a component, with its history, among the removed ones, and drops the oldest of those over the limit. */
async function removePrefab(transaction: IDBTransaction, prefabId: string) {
  const meta = transaction.objectStore(StoreName.Meta)
  const records = (await allRecords(transaction)).sort((a, b) => a.order - b.order)
  const index = records.findIndex(record => record.prefab.prefabId === prefabId)
  if (index < 0) return
  const history: unknown = await requestResult(meta.get(`${HISTORY_PREFIX}${prefabId}`))
  const record: DeletedRecord = {
    ...records[index],
    index,
    deletedAt: Date.now(),
    ...(isSavedHistory(history) ? { history } : {}),
  }
  meta.put(record, `${DELETED_PREFIX}${prefabId}`)
  meta.delete(`${HISTORY_PREFIX}${prefabId}`)
  transaction.objectStore(StoreName.Prefabs).delete(prefabId)
  for (const old of (await deletedRecords(transaction)).slice(MAX_DELETED_PREFABS))
    meta.delete(`${DELETED_PREFIX}${old.prefab.prefabId}`)
}

/** Saved components, one record each, so tabs that change different components do not overwrite each other. */
export async function openPrefabRepository({
  factory = indexedDB,
  channel = openLibraryChannel(),
  legacyStorage = window.localStorage,
  locks = createTabLocks(),
}: RepositorySources = {}): Promise<PrefabLibrary> {
  const database = await openDatabase(factory, DATABASE_NAME, DATABASE_VERSION, createStores)
  const write = (stores: StoreName[], work: (transaction: IDBTransaction) => Promise<void>) =>
    runTransaction(database, stores, TransactionMode.Write, work)

  const legacy = legacyStorage.getItem(LEGACY_PREFABS_KEY)
  await write([StoreName.Prefabs, StoreName.Meta], async transaction => {
    const meta = transaction.objectStore(StoreName.Meta)
    // The raw value is kept here, so removing it from the old storage loses nothing, broken entries included.
    if (legacy !== null) meta.put(legacy, `${LEGACY_BACKUP_PREFIX}${Date.now()}`)
    if (await requestResult(meta.get(LEGACY_IMPORTED_KEY))) return
    readLegacyPrefabs(legacy).forEach((prefab, order) => {
      transaction.objectStore(StoreName.Prefabs).put({ prefab, order }, prefab.prefabId)
    })
    meta.put(true, LEGACY_IMPORTED_KEY)
  })
  if (legacy !== null) legacyStorage.removeItem(LEGACY_PREFABS_KEY)

  return {
    list: () =>
      runTransaction(database, [StoreName.Prefabs], TransactionMode.Read, async transaction =>
        (await allRecords(transaction)).sort((a, b) => a.order - b.order).map(record => record.prefab),
      ),
    put: async prefab => {
      await write([StoreName.Prefabs, StoreName.Meta], transaction => putPrefab(transaction, prefab))
      channel.post()
    },
    remove: async prefabId => {
      await write([StoreName.Prefabs, StoreName.Meta], transaction => removePrefab(transaction, prefabId))
      channel.post()
    },
    listDeleted: () =>
      runTransaction(database, [StoreName.Meta], TransactionMode.Read, async transaction =>
        (await deletedRecords(transaction)).map(({ prefab, index, deletedAt }) => ({ prefab, index, deletedAt })),
      ),
    readHistory: prefabId =>
      runTransaction(database, [StoreName.Meta], TransactionMode.Read, async transaction => {
        const value: unknown = await requestResult(
          transaction.objectStore(StoreName.Meta).get(`${HISTORY_PREFIX}${prefabId}`),
        )
        return isSavedHistory(value) ? value : null
      }),
    writeHistory: (prefabId, history) =>
      write([StoreName.Meta], async transaction => {
        transaction.objectStore(StoreName.Meta).put(history, `${HISTORY_PREFIX}${prefabId}`)
      }),
    subscribe: listener => channel.subscribe(listener),
    lock: prefabId => locks.tryAcquire(`ui-builder:prefab:${prefabId}`, () => {}),
  }
}
