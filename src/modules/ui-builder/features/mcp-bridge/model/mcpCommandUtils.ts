import { type useUiTreeStore, type UiNode } from '../../../entities/ui-node'

export type Store = ReturnType<typeof useUiTreeStore>
export type Args = Record<string, any>
export type McpCommand = (store: Store, args: Args) => unknown

export const summarize = (node: UiNode): unknown => ({
  id: node.id,
  type: node.type,
  name: node.name,
  ...(Object.keys(node.props).length ? { props: node.props } : {}),
  ...(node.classes.length ? { classes: node.classes } : {}),
  ...(node.model ? { model: node.model } : {}),
  ...(node.vIf ? { vIf: node.vIf } : {}),
  ...(node.vFor ? { vFor: node.vFor } : {}),
  ...(node.events ? { events: node.events } : {}),
  ...(node.children.length ? { children: node.children.map(summarize) } : {}),
  ...(Object.keys(node.slots).length
    ? { slots: Object.fromEntries(Object.entries(node.slots).map(([k, v]) => [k, v.map(summarize)])) }
    : {}),
})

export const need = (store: Store, id: unknown): UiNode => {
  const node = typeof id === 'string' ? store.findNodeById(id) : null
  if (!node) throw new Error(`Node not found: ${String(id)}`)
  return node
}

export const ok = (success: boolean, message: string) => {
  if (!success) throw new Error(message)
}
