import { needEditable, ok, type Args, type McpCommand, type Store } from './mcpCommandUtils'
import { buildSubtree, type SubtreeSpec } from './mcpSubtree'

/**
 * Commands that cannot run inside a batch: a batch is one undo step, and these work on history or replace everything.
 * The project commands are not in the command table at all, so a batch refuses them too.
 */
const NOT_IN_BATCH = new Set([
  'batch',
  'undo',
  'redo',
  'import_document',
  // They change what the other steps work on, and opening waits for other tabs.
  'edit_saved_component',
  'close_saved_component',
])
const REFERENCE = /^\$(\d+)((?:\.[A-Za-z_$][\w$-]*)*)$/

/** Replaces `"$2.id"` in a value with that field of the result of step 2, so a step can use what an earlier one made. */
export function resolveReferences(value: unknown, results: unknown[]): unknown {
  if (typeof value === 'string') {
    const match = REFERENCE.exec(value)
    if (!match) return value
    const step = Number(match[1])
    if (step >= results.length) throw new Error(`“${value}” refers to a step that has not run yet.`)
    let current: unknown = results[step]
    for (const key of match[2].split('.').filter(Boolean)) {
      current = (current as Record<string, unknown> | undefined)?.[key]
    }
    if (current === undefined) throw new Error(`“${value}” has no value.`)
    return current
  }
  if (Array.isArray(value)) return value.map(item => resolveReferences(item, results))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveReferences(item, results)]))
  }
  return value
}

export const createBuildCommands = (commands: Record<string, McpCommand>): Record<string, McpCommand> => ({
  add_subtree(store: Store, a: Args) {
    const parent = needEditable(store, a.parentId ?? store.rootNode.id)
    const { node, refs } = buildSubtree(store, a.tree as SubtreeSpec)
    store.transaction(() => {
      ok(
        a.slot ? store.appendToSlot(parent.id, a.slot, node) : store.appendChild(parent.id, node),
        `${parent.name} cannot contain ${node.type}${a.slot ? ` in slot ${a.slot}` : ''}`,
      )
    })
    return { id: node.id, refs }
  },

  batch(store: Store, a: Args) {
    const steps = a.steps as Array<{ tool: string; args?: Args }>
    if (!Array.isArray(steps) || !steps.length) throw new Error('A batch needs at least one step.')
    const results: unknown[] = []
    // One undo step for the whole batch. If a step fails, the earlier ones are put back too.
    store.transaction(() => {
      steps.forEach(({ tool, args }, index) => {
        const handler = commands[tool]
        if (!handler || NOT_IN_BATCH.has(tool)) throw new Error(`Step ${index}: “${tool}” cannot be used in a batch.`)
        try {
          results.push(handler(store, (resolveReferences(args ?? {}, results) as Args) ?? {}))
        } catch (error) {
          throw new Error(`Step ${index} (${tool}) failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      })
    })
    return { results }
  },
})
