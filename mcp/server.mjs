#!/usr/bin/env node
// MCP server for UI Builder. Talks MCP over stdio and relays commands to the editor open in the browser
// through a local HTTP/SSE bridge (the document lives in the browser, not on disk).
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const PORT = Number(process.env.UI_BUILDER_MCP_PORT ?? 3002)
const TIMEOUT_MS = 10_000
const clients = new Set()
const pending = new Map()

const bridge = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    res.write(': connected\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }
  if (req.url === '/result' && req.method === 'POST') {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => {
      try {
        const { id, result, error } = JSON.parse(data)
        const entry = pending.get(id)
        if (entry) { pending.delete(id); error ? entry.reject(new Error(error)) : entry.resolve(result) }
      } catch {}
      res.writeHead(204).end()
    })
    return
  }
  res.writeHead(404).end()
})
bridge.on('error', e => console.error(`[ui-builder-mcp] bridge failed: ${e.message}`))
bridge.listen(PORT, '127.0.0.1', () => console.error(`[ui-builder-mcp] bridge on http://127.0.0.1:${PORT}`))

function call(command, args = {}) {
  const [client] = clients
  if (!client) return Promise.reject(new Error(`No editor connected. Run "npm run dev" and open http://localhost:3001 in a browser.`))
  const id = randomUUID()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Editor did not respond in time.')) }, TIMEOUT_MS)
    pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v) }, reject: e => { clearTimeout(timer); reject(e) } })
    client.write(`data: ${JSON.stringify({ id, command, args })}\n\n`)
  })
}

const server = new McpServer({ name: 'ui-builder', version: '0.1.0' })
const tool = (name, description, shape, command = name) =>
  server.registerTool(name, { description, inputSchema: shape }, async args => {
    try {
      const result = await call(command, args)
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] }
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] }
    }
  })

const id = z.string().describe('Node id')
const slot = z.string().optional().describe('Named slot of the parent (omit for default children)')

tool('get_document', 'Get the whole page tree (ids, types, props, classes, children, slots) and current selection.', {})
tool('get_node', 'Get one node and its subtree.', { id })
tool('list_components', 'List available component types with their slots and default props.', {})
tool('add_component', 'Add a component to a container. Returns the new node id.', {
  type: z.string().describe('Component type, e.g. VBtn, VCard, div (see list_components)'),
  parentId: z.string().optional().describe('Container id; defaults to the page root'),
  slot,
  name: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  classes: z.array(z.string()).optional(),
  text: z.string().optional().describe('Text content for components with a text child (buttons, headings)'),
})
tool('update_node', 'Change a node. props are merged; a null prop value removes it; classes replaces all classes.', {
  id, name: z.string().optional(), props: z.record(z.string(), z.unknown()).optional(),
  classes: z.array(z.string()).optional(), text: z.string().optional(),
})
tool('delete_node', 'Delete a node and its subtree.', { id })
tool('move_node', 'Move a node into another container.', { id, parentId: z.string(), slot })
tool('duplicate_node', 'Duplicate a node next to the original.', { id })
tool('add_template', 'Insert a starter template.', { kind: z.enum(['card', 'form', 'columns']) })
tool('select_node', 'Select a node in the editor (omit id to clear).', { id: z.string().optional() })
tool('undo', 'Undo the last change.', {})
tool('redo', 'Redo the last undone change.', {})
tool('export_document', 'Export the page as JSON text.', {})
tool('import_document', 'Replace the page with exported JSON (undoable).', { json: z.string() })

await server.connect(new StdioServerTransport())
