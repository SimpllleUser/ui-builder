import {
  findPrefabPropNames,
  prefabValuesError,
  WRAP_CONTAINER_TYPES,
  type PrefabProp,
  type PrefabPropValues,
  type UiNode,
} from '../../../entities/ui-node'
import { parameterFromInput } from './mcpParameters'
import { editingTarget, need, needEditable, ok, summarize, type McpCommand, type Store } from './mcpCommandUtils'

/** Parameter values given by an agent as `{ name: text }`; anything else is ignored. */
function propValues(input: unknown): PrefabPropValues {
  if (input === null || typeof input !== 'object') return {}
  return Object.fromEntries(Object.entries(input).map(([name, value]) => [name, String(value)]))
}

const needSaved = (store: Store, prefabId: unknown) => {
  const prefab = store.prefabs.find(item => item.prefabId === prefabId)
  if (!prefab) throw new Error(`No saved component ${String(prefabId)} (see list_saved_components).`)
  return prefab
}

/** The definitions for a component being saved; those the element does not use yet are kept as declared. */
function newParameters(node: UiNode, input: unknown, defaults: PrefabPropValues): PrefabProp[] {
  if (input === undefined) return []
  ok(Array.isArray(input), 'parameters is a list.')
  const used = findPrefabPropNames(node)
  const parameters = (input as unknown[]).map(item => {
    const parameter = parameterFromInput(item, name => !used.includes(name))
    return used.includes(parameter.name) ? parameter : { ...parameter, isDeclared: true }
  })
  ok(new Set(parameters.map(item => item.name)).size === parameters.length, 'Each parameter needs its own name.')
  const invalid = prefabValuesError(parameters, defaults)
  ok(!invalid, invalid ?? '')
  return parameters
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
    const defaults = propValues(a.props)
    const parameters = newParameters(node, a.parameters, defaults)
    const countBefore = store.prefabs.length
    store.savePrefab(node.id, name, defaults, parameters)
    ok(store.prefabs.length > countBefore, 'Could not save the component.')
    return { prefabId: store.prefabs[store.prefabs.length - 1].prefabId, name }
  },
  set_parameter: (store, a) => {
    const prefab = needSaved(store, a.prefabId)
    const find = (name: string) => prefab.props?.find(item => item.name === name)
    const parameter = parameterFromInput(a.parameter, name => !find(name))
    const current = find(parameter.name)
    // A new one nothing uses yet must be marked, or the next edit of the component would drop it.
    const isDeclared = current ? current.isDeclared : true
    const error = store.setPrefabParameter(prefab.prefabId, { ...parameter, ...(isDeclared ? { isDeclared } : {}) })
    ok(!error, error ?? '')
    return { prefabId: prefab.prefabId, props: needSaved(store, prefab.prefabId).props }
  },
  remove_parameter: (store, a) => {
    const prefab = needSaved(store, a.prefabId)
    const name = String(a.name ?? '')
    ok(!!prefab.props?.some(item => item.name === name), `“${prefab.name}” has no parameter “${name}”.`)
    store.removePrefabParameter(prefab.prefabId, name)
    const props = needSaved(store, prefab.prefabId).props ?? []
    // A used name stays: it only loses its type.
    return { prefabId: prefab.prefabId, props, stillUsed: props.some(item => item.name === name) }
  },
  insert_saved_component: (store, a) => {
    if (a.parentId) needEditable(store, a.parentId)
    needSaved(store, a.prefabId)
    ok(store.insertPrefab(a.prefabId, a.parentId, a.slot ?? null, propValues(a.props)), store.notice)
    return { notice: store.notice, selected: store.selectedNodeIds }
  },
  update_instance(store, a) {
    const node = need(store, a.id)
    ok(
      store.setInstanceProps(node.id, propValues(a.props)),
      store.originalOf(node.id) ? store.notice : `“${node.name}” is not an instance of a component in My components.`,
    )
    return summarize(need(store, node.id))
  },
  detach_instance(store, a) {
    const node = need(store, a.id)
    ok(store.detachInstance(node.id), `“${node.name}” is not a component instance.`)
    return summarize(node)
  },
  /** Opens the original in the editor: every editing tool then works on it, and its instances follow. */
  async edit_saved_component(store, a) {
    const { prefabId } = needSaved(store, a.prefabId)
    store.editPrefab(prefabId)
    // Another tab may be editing it, which is known only a moment later.
    await store.prefabEditSettled()
    ok(store.editingPrefab?.prefabId === prefabId, store.notice)
    return { editing: editingTarget(store), root: summarize(store.rootNode) }
  },
  close_saved_component(store) {
    store.stopEditingPrefab()
    return { editing: editingTarget(store) }
  },
  delete_saved_component: (store, a) => {
    needSaved(store, a.prefabId)
    store.deletePrefab(a.prefabId)
    return { deleted: a.prefabId }
  },

  list_deleted_components: store =>
    store.deletedPrefabs.map(({ prefab, deletedAt }) => ({
      prefabId: prefab.prefabId,
      name: prefab.name,
      deletedAt: new Date(deletedAt).toISOString(),
    })),
  restore_saved_component: (store, a) => {
    ok(store.restorePrefab(a.prefabId), `No deleted component ${String(a.prefabId)} (see list_deleted_components).`)
    return { restored: a.prefabId }
  },

  // ─── Grouping ───────────────────────────────────────────────────────────────
  /** Puts sibling elements into a new container. Returns the container's id. */
  wrap_nodes: (store, a) => {
    const ids: string[] = Array.isArray(a.ids) ? a.ids : []
    ok(ids.length > 0, 'Give the ids of the elements to wrap.')
    ids.forEach(id => {
      need(store, id)
      // Parts of an instance stay where its original has them.
      if (store.isInsideInstance(id)) needEditable(store, id)
    })
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
    editing: editingTarget(store),
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
