import { watch } from 'vue'
import { runMcpCommand, type McpHost } from './mcpProjectCommands'
import { type useUiTreeStore } from '../../../entities/ui-node'

export const MCP_BRIDGE_URL = import.meta.env.VITE_MCP_BRIDGE_URL ?? 'http://127.0.0.1:3002'

/**
 * Connects the editor to the local MCP server (dev only). EventSource reconnects on its own.
 * With several tabs open the server sends commands to one that edits its project, so each tab says whether it does;
 * among those, to the one loaded last, so the page's load time is part of the address.
 */
export function connectMcpBridge(store: ReturnType<typeof useUiTreeStore>, host: McpHost) {
  const tab = crypto.randomUUID()
  const isEditing = () => host.refusal() === null
  const post = (path: string, body: unknown) =>
    fetch(`${MCP_BRIDGE_URL}${path}`, { method: 'POST', body: JSON.stringify(body) }).catch(() => {})
  const source = new EventSource(
    `${MCP_BRIDGE_URL}/events?loaded=${Math.round(performance.timeOrigin)}&tab=${tab}&editing=${isEditing()}`,
  )
  const report = () => post('/tab', { tab, editing: isEditing() })
  // The address keeps what was true at first, so it is said again after every reconnect.
  source.onopen = report
  const stopWatching = watch(isEditing, report)
  source.onmessage = async event => {
    const { id, command, args } = JSON.parse(event.data)
    let body: Record<string, unknown>
    try {
      body = { id, result: (await runMcpCommand(store, host, command, args)) ?? null }
    } catch (error) {
      body = { id, error: error instanceof Error ? error.message : String(error) }
    }
    await post('/result', body)
  }
  return () => {
    stopWatching()
    source.close()
  }
}
