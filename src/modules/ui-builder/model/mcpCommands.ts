import { COMPONENT_DEFS } from '../entities/ui-node/model/componentDefinitions'
import { TEXT_NODE_TYPE } from '../entities/ui-node/model/constants'
import type { TemplateKind } from '../entities/ui-node/model/templateFactory'
import type { UiNode } from '../entities/ui-node/model/types'
import { need, ok, summarize, type Args, type McpCommand, type Store } from './mcpCommandUtils'
import { MCP_PAGE_COMMANDS, pageSummary } from './mcpPageCommands'

/** Sets the text of a component, adding a text child when it can hold one (e.g. VCol). */
const setText = (store: Store, node: UiNode, text: string) => {
  let textNode = node.children.find(c => c.type === TEXT_NODE_TYPE)
  if (!textNode) {
    if (!store.canContain(node)) throw new Error(`${node.type} cannot contain text`)
    textNode = store.createNode(TEXT_NODE_TYPE, text)
    node.children.unshift(textNode)
  }
  textNode.name = text
}
const applyStyleAndAttrs = (node: UiNode, a: Args) => {
  if (a.style !== undefined) {
    if (a.style === null) delete node.props.style
    else if (typeof a.style === 'string') node.props.style = a.style
    else {
      const current = node.props.style
      const base = current && typeof current === 'object' ? (current as Record<string, unknown>) : {}
      node.props.style = { ...base, ...a.style }
    }
  }
  for (const [k, v] of Object.entries(a.attrs ?? {})) {
    if (v === null) delete node.props[k]
    else node.props[k] = v
  }
}
export const MCP_COMMANDS: Record<string, McpCommand> = {
  ...MCP_PAGE_COMMANDS,
  get_document: store => ({
    editing: store.editingLayout ? 'layout' : store.activePage.id,
    pages: pageSummary(store),
    hasLayout: !!store.project.layout,
    state: store.project.state,
    root: summarize(store.rootNode),
    selected: store.selectedNodeIds,
  }),
  get_node: (store, a) => summarize(need(store, a.id)),
  list_components: () =>
    Object.values(COMPONENT_DEFS).map(d => ({
      type: d.type,
      label: d.label,
      isLeaf: !!d.isLeaf,
      slots: d.slots.map(s => s.name),
      defaultProps: d.defaultProps,
    })),
  add_component(store, a) {
    const parent = need(store, a.parentId ?? store.rootNode.id)
    const node = store.createNode(a.type)
    if (a.name) node.name = a.name
    if (a.props) Object.assign(node.props, a.props)
    if (a.classes) node.classes = a.classes
    if (a.text !== undefined) setText(store, node, a.text)
    applyStyleAndAttrs(node, a)
    ok(
      a.slot ? store.appendToSlot(parent.id, a.slot, node) : store.appendChild(parent.id, node),
      `${parent.name} cannot contain ${a.type}${a.slot ? ` in slot ${a.slot}` : ''}`,
    )
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
    if (a.text !== undefined) setText(store, node, a.text)
    applyStyleAndAttrs(node, a)
    store.commit()
    return summarize(node)
  },
  delete_node(store, a) {
    need(store, a.id)
    ok(store.deleteNode(a.id), 'Cannot delete this node (root?)')
    return { deleted: a.id }
  },
  move_node(store, a) {
    need(store, a.id)
    need(store, a.parentId)
    ok(store.moveNode(a.id, a.parentId, a.slot ?? null), 'Cannot move node there')
    return { moved: a.id }
  },
  duplicate_node: (store, a) => ({ id: store.duplicateNode(need(store, a.id).id) }),
  add_template(store, a) {
    store.addTemplate(a.kind as TemplateKind)
    return { notice: store.notice }
  },
  select_node: (store, a) => {
    store.selectNode(a.id ?? null)
    return { selected: store.selectedNodeIds }
  },
  undo: store => {
    store.undo()
    return { canUndo: store.canUndo, canRedo: store.canRedo }
  },
  redo: store => {
    store.redo()
    return { canUndo: store.canUndo, canRedo: store.canRedo }
  },
  export_document: store => store.exportDocument(),
  import_document: (store, a) => {
    store.importDocument(a.json)
    return { notice: store.notice }
  },
}

export function executeMcpCommand(store: Store, command: string, args: Args = {}) {
  const handler = MCP_COMMANDS[command]
  if (!handler) throw new Error(`Unknown command: ${command}`)
  return handler(store, args)
}
