import { needEditable, summarize, type McpCommand } from './mcpCommandUtils'
import { applyStyleInput, parseBreakpoint, plainResponsive, plainStyle } from './mcpStyle'

export const MCP_STYLE_COMMANDS: Record<string, McpCommand> = {
  set_style(store, a) {
    const node = needEditable(store, a.id)
    const breakpoint = parseBreakpoint(a.breakpoint)
    store.transaction(() => applyStyleInput(node, a.style, breakpoint))
    return { id: node.id, style: plainStyle(node), responsive: plainResponsive(node), node: summarize(node) }
  },
}
