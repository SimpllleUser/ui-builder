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
  ...(node.responsive ? { responsive: node.responsive } : {}),
  ...(node.model ? { model: node.model } : {}),
  ...(node.vIf ? { vIf: node.vIf } : {}),
  ...(node.vFor ? { vFor: node.vFor } : {}),
  ...(node.events ? { events: node.events } : {}),
  ...(node.rules ? { rules: node.rules } : {}),
  // The stamp is the editor's own bookkeeping.
  ...(node.instance ? { instance: { prefabId: node.instance.prefabId, values: node.instance.values } } : {}),
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

/** An element an agent may change: not an instance, nor anything inside one. */
export const needEditable = (store: Store, id: unknown): UiNode => {
  const node = need(store, id)
  if (store.isLocked(node.id))
    throw new Error(
      `“${node.name}” is a component instance or part of one: change its parameters with update_instance, or detach_instance first.`,
    )
  return node
}

/** What the editing tools act on now: a saved component, the shared layout or a page. */
export const editingTarget = (store: Store) =>
  store.editingPrefab
    ? { component: store.editingPrefab.prefabId, name: store.editingPrefab.name }
    : store.editingLayout
      ? 'layout'
      : store.activePage.id

export const ok = (success: boolean, message: string) => {
  if (!success) throw new Error(message)
}
