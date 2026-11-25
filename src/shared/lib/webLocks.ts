/** Locks that only one tab can hold at a time (Web Locks API). The browser frees them when a tab goes away. */

export interface HeldLock {
  release(): void
}

export interface TabLocks {
  /** Resolves with null when another holder has it. */
  tryAcquire(name: string, onStolen: () => void): Promise<HeldLock | null>
  /** Waits for the holder to let go; resolves with null when that does not happen in time. */
  waitFor(name: string, timeoutMs: number, onStolen: () => void): Promise<HeldLock | null>
  /** Takes the lock from whoever has it. */
  steal(name: string, onStolen: () => void): Promise<HeldLock | null>
}

function request(manager: LockManager, name: string, options: LockOptions, onStolen: () => void) {
  return new Promise<HeldLock | null>((resolve, reject) => {
    let granted = false
    manager
      .request(name, options, lock => {
        if (!lock) {
          resolve(null)
          return
        }
        granted = true
        // The lock is held for as long as this promise is pending.
        return new Promise<void>(release => resolve({ release: () => release() }))
      })
      .catch((error: unknown) => {
        if (granted) onStolen()
        else if (options.signal?.aborted) resolve(null)
        else reject(error)
      })
  })
}

/** Where the API is missing (a page served over plain HTTP), every request is granted: nothing can be locked. */
export function createTabLocks(manager: LockManager | undefined = globalThis.navigator?.locks): TabLocks {
  if (!manager) {
    const grant = async () => ({ release: () => {} })
    return { tryAcquire: grant, waitFor: grant, steal: grant }
  }
  return {
    tryAcquire: (name, onStolen) => request(manager, name, { ifAvailable: true }, onStolen),
    waitFor: (name, timeoutMs, onStolen) =>
      request(manager, name, { signal: AbortSignal.timeout(timeoutMs) }, onStolen),
    steal: (name, onStolen) => request(manager, name, { steal: true }, onStolen),
  }
}
