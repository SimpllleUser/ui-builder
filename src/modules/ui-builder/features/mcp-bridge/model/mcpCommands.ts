import { COMPONENT_DEFS, TEXT_NODE_TYPE, type TemplateKind, type UiNode } from '../../../entities/ui-node'
import { need, needEditable, ok, summarize, type Args, type McpCommand, type Store } from './mcpCommandUtils'
import { MCP_PAGE_COMMANDS, pageSummary } from './mcpPageCommands'
import { MCP_TABLE_COMMANDS } from './mcpTableCommands'
import { MCP_DIAGNOSTIC_COMMANDS } from './mcpDiagnosticCommands'
import { MCP_HISTORY_COMMANDS } from './mcpHistoryCommands'
import { MCP_COMPONENT_COMMANDS } from './mcpComponentCommands'
import { MCP_STYLE_COMMANDS } from './mcpStyleCommands'
import { createBuildCommands } from './mcpBuildCommands'
import { applyStyleInput } from './mcpStyle'

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
  if (a.style !== undefined) applyStyleInput(node, a.style)
  for (const [k, v] of Object.entries(a.attrs ?? {})) {
    if (v === null) delete node.props[k]
    else node.props[k] = v
  }
}
export const MCP_COMMANDS: Record<string, McpCommand> = {
  ...MCP_PAGE_COMMANDS,
  ...MCP_TABLE_COMMANDS,
  ...MCP_DIAGNOSTIC_COMMANDS,
  ...MCP_STYLE_COMMANDS,
  ...MCP_HISTORY_COMMANDS,
  ...MCP_COMPONENT_COMMANDS,
  get_document: store => ({
    editing: store.editingLayout ? 'layout' : store.activePage.id,
    pages: pageSummary(store),
    hasLayout: !!store.project.layout,
    state: store.project.state,
    ...(store.project.computed ? { computed: store.project.computed } : {}),
    ...(store.project.sources ? { sources: store.project.sources } : {}),
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
    // An instance may be renamed; everything else about it comes from the original.
    const onlyRenames = Object.keys(a).every(key => key === 'id' || key === 'name') && !store.isInsideInstance(a.id)
    const node = onlyRenames ? need(store, a.id) : needEditable(store, a.id)
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
    ok(store.deleteNode(a.id), 'Cannot delete this node (the root, or part of a component instance)')
    return { deleted: a.id }
  },
  move_node(store, a) {
    need(store, a.id)
    need(store, a.parentId)
    ok(store.moveNode(a.id, a.parentId, a.slot ?? null), 'Cannot move node there')
    return { moved: a.id }
  },
  duplicate_node(store, a) {
    const id = store.duplicateNode(need(store, a.id).id)
    ok(!!id, store.notice || 'Cannot duplicate this node')
    return { id }
  },
  add_template(store, a) {
    store.addTemplate(a.kind as TemplateKind, a.props ?? {})
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

// Defined after the table above because a batch can run any command in it.
Object.assign(MCP_COMMANDS, createBuildCommands(MCP_COMMANDS))

export function executeMcpCommand(store: Store, command: string, args: Args = {}) {
  const handler = MCP_COMMANDS[command]
  if (!handler) throw new Error(`Unknown command: ${command}`)
  return handler(store, args)
}
