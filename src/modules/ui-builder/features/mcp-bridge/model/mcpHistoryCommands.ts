import { ok, type McpCommand } from './mcpCommandUtils'

const MAX_LISTED_VERSIONS = 50

export const MCP_HISTORY_COMMANDS: Record<string, McpCommand> = {
  /** The named steps of the history, newest first, so an agent can see what was done and go back to one. */
  get_history: store => ({
    canUndo: store.canUndo,
    canRedo: store.canRedo,
    versions: [...store.historyVersions].reverse().slice(0, MAX_LISTED_VERSIONS),
    checkpoints: store.checkpoints.map(({ checkpointId, name, createdAt }) => ({ checkpointId, name, createdAt })),
  }),
  create_checkpoint: (store, a) => {
    ok(store.createCheckpoint(String(a.name ?? '')), 'A checkpoint needs a name.')
    const [created] = store.checkpoints
    return { checkpointId: created.checkpointId, name: created.name }
  },
  restore_checkpoint: (store, a) => {
    ok(store.restoreCheckpoint(String(a.checkpointId)), `No checkpoint ${String(a.checkpointId)} (see get_history).`)
    return { restored: a.checkpointId }
  },
  restore_version: (store, a) => {
    const known = store.historyVersions.some(version => version.index === a.index)
    ok(known, `No history version ${String(a.index)} (see get_history).`)
    store.restoreHistoryVersion(a.index)
    return { restored: a.index }
  },
  delete_checkpoint: (store, a) => {
    ok(
      store.checkpoints.some(item => item.checkpointId === a.checkpointId),
      `No checkpoint ${String(a.checkpointId)}.`,
    )
    store.deleteCheckpoint(a.checkpointId)
    return { deleted: a.checkpointId }
  },
}
