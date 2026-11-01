import { executeMcpCommand } from './mcpCommands'
import type { useUiTreeStore } from '../entities/ui-node/model/store'

export const MCP_BRIDGE_URL = import.meta.env.VITE_MCP_BRIDGE_URL ?? 'http://127.0.0.1:3002'

/** Connects the editor to the local MCP server (dev only). EventSource reconnects on its own. */
export function connectMcpBridge(store: ReturnType<typeof useUiTreeStore>) {
  const source = new EventSource(`${MCP_BRIDGE_URL}/events`)
  source.onmessage = async event => {
    const { id, command, args } = JSON.parse(event.data)
    let body: Record<string, unknown>
    try { body = { id, result: executeMcpCommand(store, command, args) ?? null } }
    catch (error) { body = { id, error: error instanceof Error ? error.message : String(error) } }
    await fetch(`${MCP_BRIDGE_URL}/result`, { method: 'POST', body: JSON.stringify(body) }).catch(() => {})
  }
  return () => source.close()
}
