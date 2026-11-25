// Public API of this slice: everything outside it imports from here, never from the files inside.
export { connectMcpBridge } from './model/mcpBridge'
export { executeMcpCommand } from './model/mcpCommands'
export { runMcpCommand } from './model/mcpProjectCommands'
export type { McpHost, McpProjects, McpTheme } from './model/mcpProjectCommands'
