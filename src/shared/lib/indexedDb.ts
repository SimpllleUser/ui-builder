/** A small promise layer over IndexedDB. */

export enum TransactionMode {
  Read = 'readonly',
  Write = 'readwrite',
}

export function openDatabase(
  factory: IDBFactory,
  name: string,
  version: number,
  upgrade: (database: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version)
    request.onupgradeneeded = () => upgrade(request.result)
    request.onsuccess = () => {
      const database = request.result
      // A newer version of the app in another tab must not be blocked by this one.
      database.onversionchange = () => database.close()
      resolve(database)
    }
    request.onerror = () => reject(request.error)
  })
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Runs `work` in one transaction and resolves only after it is committed. If `work` fails, nothing is written.
 * `work` may await requests of this transaction only: awaiting anything else lets the transaction close.
 */
export async function runTransaction<T>(
  database: IDBDatabase,
  storeNames: string[],
  mode: TransactionMode,
  work: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const transaction = database.transaction(storeNames, mode)
  const committed = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
  })
  try {
    const result = await work(transaction)
    await committed
    return result
  } catch (error) {
    committed.catch(() => {})
    try {
      transaction.abort()
    } catch {
      /* already finished or aborted by the failure itself */
    }
    throw error
  }
}
