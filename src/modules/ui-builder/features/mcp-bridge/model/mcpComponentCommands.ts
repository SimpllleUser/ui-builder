import { WRAP_CONTAINER_TYPES, type PrefabPropValues } from '../../../entities/ui-node'
import { need, ok, summarize, type McpCommand } from './mcpCommandUtils'

/** Parameter values given by an agent as `{ name: text }`; anything else is ignored. */
function propValues(input: unknown): PrefabPropValues {
  if (input === null || typeof input !== 'object') return {}
  return Object.fromEntries(Object.entries(input).map(([name, value]) => [name, String(value)]))
}

const WRAP_TYPES = WRAP_CONTAINER_TYPES.map(item => item.type)

export const MCP_COMPONENT_COMMANDS: Record<string, McpCommand> = {
  // ─── My components (saved elements that can be inserted again) ───────────────
  list_saved_components: store =>
    store.prefabs.map(prefab => ({
      prefabId: prefab.prefabId,
      name: prefab.name,
      props: prefab.props ?? [],
      preview: summarize(prefab.node),
    })),
  save_component: (store, a) => {
    const node = need(store, a.id)
    const name = String(a.name ?? '').trim()
    ok(!!name, 'A saved component needs a name.')
    const countBefore = store.prefabs.length
    store.savePrefab(node.id, name, propValues(a.props))
    ok(store.prefabs.length > countBefore, 'Could not save the component.')
    return { prefabId: store.prefabs[store.prefabs.length - 1].prefabId, name }
  },
  insert_saved_component: (store, a) => {
    if (a.parentId) need(store, a.parentId)
    ok(
      store.insertPrefab(a.prefabId, a.parentId, a.slot ?? null, propValues(a.props)),
      `No saved component ${String(a.prefabId)} (see list_saved_components).`,
    )
    return { notice: store.notice, selected: store.selectedNodeIds }
  },
  update_instance(store, a) {
    const node = need(store, a.id)
    ok(
      store.setInstanceProps(node.id, propValues(a.props)),
      `“${node.name}” is not an instance of a component in My components.`,
    )
    return summarize(need(store, node.id))
  },
  detach_instance(store, a) {
    const node = need(store, a.id)
    ok(store.detachInstance(node.id), `“${node.name}” is not a component instance.`)
    return summarize(node)
  },
  delete_saved_component: (store, a) => {
    ok(
      store.prefabs.some(prefab => prefab.prefabId === a.prefabId),
      `No saved component ${String(a.prefabId)}.`,
    )
    store.deletePrefab(a.prefabId)
    return { deleted: a.prefabId }
  },

  // ─── Grouping ───────────────────────────────────────────────────────────────
  /** Puts sibling elements into a new container. Returns the container's id. */
  wrap_nodes: (store, a) => {
    const ids: string[] = Array.isArray(a.ids) ? a.ids : []
    ok(ids.length > 0, 'Give the ids of the elements to wrap.')
    ids.forEach(id => need(store, id))
    ok(WRAP_TYPES.includes(a.type), `Wrap with one of: ${WRAP_TYPES.join(', ')}.`)
    store.wrapNodes(ids, a.type)
    const [wrapperId] = store.selectedNodeIds
    ok(
      store.findParentAndIndex(ids[0])?.parent.id === wrapperId,
      'The elements must be siblings in the same container to be wrapped.',
    )
    return { id: wrapperId }
  },
  unwrap_node: (store, a) => {
    need(store, a.id)
    ok(store.unwrapNode(a.id), store.notice || 'Cannot unwrap this element.')
    return { selected: store.selectedNodeIds }
  },

  /** A short picture of where the editor is: what an agent should know before it starts. */
  get_status: store => ({
    connected: true,
    editing: store.editingLayout ? 'layout' : store.activePage.id,
    page: { id: store.activePage.id, name: store.activePage.name, path: store.activePage.path },
    pages: store.project.pages.length,
    hasLayout: !!store.project.layout,
    variables: Object.keys(store.project.state),
    selected: store.selectedNodeIds,
    previewing: store.isPreviewMode,
    canUndo: store.canUndo,
    canRedo: store.canRedo,
    savedComponents: store.prefabs.length,
    checkpoints: store.checkpoints.length,
  }),
}
