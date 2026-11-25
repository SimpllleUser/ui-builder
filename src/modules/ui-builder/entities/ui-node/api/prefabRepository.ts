import { openDatabase, requestResult, runTransaction, TransactionMode } from '../../../../../shared/lib/indexedDb'
import type { PrefabLibrary } from '../model/prefabSync'
import type { Prefab } from '../model/types'

// A database of its own: the library belongs to no project, and its schema changes on its own.
const DATABASE_NAME = 'ui-builder-library'
const DATABASE_VERSION = 1
const CHANNEL_NAME = 'ui-builder:prefabs'
const LEGACY_IMPORTED_KEY = 'legacy-imported'
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
  /** Where the library lived before, to be moved over once. The old key is kept. */
  legacyStorage?: Pick<Storage, 'getItem'>
}

/** Saved components, one record each, so tabs that change different components do not overwrite each other. */
export async function openPrefabRepository({
  factory = indexedDB,
  channel = openLibraryChannel(),
  legacyStorage = window.localStorage,
}: RepositorySources = {}): Promise<PrefabLibrary> {
  const database = await openDatabase(factory, DATABASE_NAME, DATABASE_VERSION, createStores)
  const write = (stores: StoreName[], work: (transaction: IDBTransaction) => Promise<void>) =>
    runTransaction(database, stores, TransactionMode.Write, work)

  await write([StoreName.Prefabs, StoreName.Meta], async transaction => {
    const meta = transaction.objectStore(StoreName.Meta)
    if (await requestResult(meta.get(LEGACY_IMPORTED_KEY))) return
    readLegacyPrefabs(legacyStorage.getItem(LEGACY_PREFABS_KEY)).forEach((prefab, order) => {
      transaction.objectStore(StoreName.Prefabs).put({ prefab, order }, prefab.prefabId)
    })
    meta.put(true, LEGACY_IMPORTED_KEY)
  })

  return {
    list: () =>
      runTransaction(database, [StoreName.Prefabs], TransactionMode.Read, async transaction =>
        (await allRecords(transaction)).sort((a, b) => a.order - b.order).map(record => record.prefab),
      ),
    put: async prefab => {
      await write([StoreName.Prefabs], async transaction => {
        const records = await allRecords(transaction)
        const existing = records.find(record => record.prefab.prefabId === prefab.prefabId)
        const order = existing?.order ?? Math.max(-1, ...records.map(record => record.order)) + 1
        transaction.objectStore(StoreName.Prefabs).put({ prefab, order }, prefab.prefabId)
      })
      channel.post()
    },
    remove: async prefabId => {
      await write([StoreName.Prefabs], async transaction => {
        transaction.objectStore(StoreName.Prefabs).delete(prefabId)
      })
      channel.post()
    },
    subscribe: listener => channel.subscribe(listener),
  }
}
