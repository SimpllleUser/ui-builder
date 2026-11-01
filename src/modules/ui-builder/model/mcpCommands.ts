import { COMPONENT_DEFS } from '../entities/ui-node/model/componentDefinitions'
import { TEXT_NODE_TYPE } from '../entities/ui-node/model/constants'
import type { useUiTreeStore } from '../entities/ui-node/model/store'
import type { TemplateKind } from '../entities/ui-node/model/templateFactory'
import type { UiNode } from '../entities/ui-node/model/types'

type Store = ReturnType<typeof useUiTreeStore>
type Args = Record<string, any>

const summarize = (node: UiNode): unknown => ({
  id: node.id, type: node.type, name: node.name,
  ...(Object.keys(node.props).length ? { props: node.props } : {}),
  ...(node.classes.length ? { classes: node.classes } : {}),
  ...(node.children.length ? { children: node.children.map(summarize) } : {}),
  ...(Object.keys(node.slots).length ? { slots: Object.fromEntries(Object.entries(node.slots).map(([k, v]) => [k, v.map(summarize)])) } : {}),
})

const need = (store: Store, id: unknown): UiNode => {
  const node = typeof id === 'string' ? store.findNodeById(id) : null
  if (!node) throw new Error(`Node not found: ${String(id)}`)
  return node
}
const ok = (success: boolean, message: string) => {
  if (!success) throw new Error(message)
}

export const MCP_COMMANDS: Record<string, (store: Store, args: Args) => unknown> = {
  get_document: store => ({ root: summarize(store.rootNode), selected: store.selectedNodeIds }),
  get_node: (store, a) => summarize(need(store, a.id)),
  list_components: () => Object.values(COMPONENT_DEFS).map(d => ({
    type: d.type, label: d.label, isLeaf: !!d.isLeaf, slots: d.slots.map(s => s.name), defaultProps: d.defaultProps,
  })),
  add_component(store, a) {
    const parent = need(store, a.parentId ?? store.rootNode.id)
    const node = store.createNode(a.type)
    if (a.name) node.name = a.name
    if (a.props) Object.assign(node.props, a.props)
    if (a.classes) node.classes = a.classes
    if (a.text !== undefined) {
      const textNode = node.children.find(c => c.type === TEXT_NODE_TYPE)
      if (!textNode) throw new Error(`${a.type} has no text content`)
      textNode.name = a.text
    }
    ok(a.slot ? store.appendToSlot(parent.id, a.slot, node) : store.appendChild(parent.id, node), `${parent.name} cannot contain ${a.type}${a.slot ? ` in slot ${a.slot}` : ''}`)
    return { id: node.id }
  },
  update_node(store, a) {
    const node = need(store, a.id)
    store.commit()
    if (a.name !== undefined) node.name = a.name
    if (a.classes) node.classes = a.classes
    for (const [k, v] of Object.entries(a.props ?? {})) {
      if (v === null) delete node.props[k]
      else node.props[k] = v
    }
    if (a.text !== undefined) {
      const textNode = node.children.find(c => c.type === TEXT_NODE_TYPE)
      if (!textNode) throw new Error('Node has no text content')
      textNode.name = a.text
    }
    store.commit()
    return summarize(node)
  },
  delete_node(store, a) {
    need(store, a.id)
    ok(store.deleteNode(a.id), 'Cannot delete this node (root?)')
    return { deleted: a.id }
  },
  move_node(store, a) {
    need(store, a.id); need(store, a.parentId)
    ok(store.moveNode(a.id, a.parentId, a.slot ?? null), 'Cannot move node there')
    return { moved: a.id }
  },
  duplicate_node: (store, a) => ({ id: store.duplicateNode(need(store, a.id).id) }),
  add_template(store, a) {
    store.addTemplate(a.kind as TemplateKind)
    return { notice: store.notice }
  },
  select_node: (store, a) => { store.selectNode(a.id ?? null); return { selected: store.selectedNodeIds } },
  undo: store => { store.undo(); return { canUndo: store.canUndo, canRedo: store.canRedo } },
  redo: store => { store.redo(); return { canUndo: store.canUndo, canRedo: store.canRedo } },
  export_document: store => store.exportDocument(),
  import_document: (store, a) => { store.importDocument(a.json); return { notice: store.notice } },
}

export function executeMcpCommand(store: Store, command: string, args: Args = {}) {
  const handler = MCP_COMMANDS[command]
  if (!handler) throw new Error(`Unknown command: ${command}`)
  return handler(store, args)
}
