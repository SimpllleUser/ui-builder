import type { HeldLock, TabLocks } from '../../../../../shared/lib/webLocks'

const HAND_OVER_TIMEOUT_MS = 4000
const lockName = (id: string) => `ui-builder:project:${id}`

/** How to take over a project another tab is editing. */
export enum Takeover {
  /** Ask that tab to save and let go. */
  Ask = 'ask',
  /** Take it even though that tab does not answer; what it has not saved stays only there. */
  Force = 'force',
}

/** A lock asked for and not yet decided about. */
export interface Claim {
  /** False when another tab has the project. */
  owned: boolean
  /** Makes it the project this tab owns, letting go of the previous one. */
  keep(): void
  /** Lets go of what this claim took; a project already owned stays owned. */
  giveBack(): void
}

/** Which project this tab may write: it holds at most one lock. */
export function createProjectOwnership(locks: TabLocks, onLost: () => void) {
  let held: { id: string; lock: HeldLock } | null = null
  const holds = (id: string) => held?.id === id
  const release = () => {
    held?.lock.release()
    held = null
  }
  const onStolen = (id: string) => () => {
    if (!holds(id)) return
    held = null
    onLost()
  }
  const toClaim = (id: string, lock: HeldLock | null): Claim => ({
    owned: lock !== null,
    keep: () => {
      release()
      held = lock ? { id, lock } : null
    },
    giveBack: () => lock?.release(),
  })

  /** Takes the lock if it is free, without giving up the one held so far. */
  const claim = async (id: string): Promise<Claim> => {
    if (holds(id)) return { owned: true, keep: () => {}, giveBack: () => {} }
    return toClaim(id, await locks.tryAcquire(lockName(id), onStolen(id)))
  }

  /** For a project another tab has: waits for it to let go, or takes it. */
  const takeOver = async (id: string, takeover: Takeover): Promise<Claim> => {
    const lock =
      takeover === Takeover.Force
        ? await locks.steal(lockName(id), onStolen(id))
        : await locks.waitFor(lockName(id), HAND_OVER_TIMEOUT_MS, onStolen(id))
    return toClaim(id, lock)
  }

  /** Runs `action` only while no tab edits the project; resolves with false when one does. */
  const whileFree = async (id: string, action: () => Promise<unknown>) => {
    const lock = await locks.tryAcquire(lockName(id), () => {})
    if (!lock) return false
    try {
      await action()
    } finally {
      lock.release()
    }
    return true
  }

  return { holds, release, claim, takeOver, whileFree }
}
