import { runMcpCommand, type McpHost } from './mcpProjectCommands'
import { type useUiTreeStore } from '../../../entities/ui-node'

export const MCP_BRIDGE_URL = import.meta.env.VITE_MCP_BRIDGE_URL ?? 'http://127.0.0.1:3002'

/**
 * Connects the editor to the local MCP server (dev only). EventSource reconnects on its own.
 * The server sends commands to the tab that was loaded last, so the page's load time is part of the address.
 */
export function connectMcpBridge(store: ReturnType<typeof useUiTreeStore>, host: McpHost) {
  const source = new EventSource(`${MCP_BRIDGE_URL}/events?loaded=${Math.round(performance.timeOrigin)}`)
  source.onmessage = async event => {
    const { id, command, args } = JSON.parse(event.data)
    let body: Record<string, unknown>
    try {
      body = { id, result: (await runMcpCommand(store, host, command, args)) ?? null }
    } catch (error) {
      body = { id, error: error instanceof Error ? error.message : String(error) }
    }
    await fetch(`${MCP_BRIDGE_URL}/result`, { method: 'POST', body: JSON.stringify(body) }).catch(() => {})
  }
  return () => source.close()
}
