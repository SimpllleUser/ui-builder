import { need, summarize, type McpCommand } from './mcpCommandUtils'
import { applyStyleInput, plainStyle } from './mcpStyle'

export const MCP_STYLE_COMMANDS: Record<string, McpCommand> = {
  set_style(store, a) {
    const node = need(store, a.id)
    store.transaction(() => applyStyleInput(node, a.style))
    return { id: node.id, style: plainStyle(node), node: summarize(node) }
  },
}
