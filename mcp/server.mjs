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
    req.on('data', c => {
      data += c
    })
    req.on('end', () => {
      try {
        const { id, result, error } = JSON.parse(data)
        const entry = pending.get(id)
        if (entry) {
          pending.delete(id)
          error ? entry.reject(new Error(error)) : entry.resolve(result)
        }
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
  if (!client)
    return Promise.reject(
      new Error(`No editor connected. Run "npm run dev" and open http://localhost:3001 in a browser.`),
    )
  const id = randomUUID()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Editor did not respond in time.'))
    }, TIMEOUT_MS)
    pending.set(id, {
      resolve: v => {
        clearTimeout(timer)
        resolve(v)
      },
      reject: e => {
        clearTimeout(timer)
        reject(e)
      },
    })
    client.write(`data: ${JSON.stringify({ id, command, args })}\n\n`)
  })
}

const server = new McpServer({ name: 'ui-builder', version: '0.1.0' })
const tool = (name, description, shape, command = name) =>
  server.registerTool(name, { description, inputSchema: shape }, async args => {
    try {
      const result = await call(command, args)
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
      }
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
  text: z.string().optional().describe('Text content for buttons, headings, columns, …'),
  style: z
    .union([z.string(), z.record(z.string(), z.string())])
    .optional()
    .describe('Inline style: CSS string or object'),
  attrs: z.record(z.string(), z.unknown()).optional().describe('Extra attributes/props merged into props'),
})
tool('update_node', 'Change a node. props are merged; a null prop value removes it; classes replaces all classes.', {
  id,
  name: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  classes: z.array(z.string()).optional(),
  text: z.string().optional().describe('Text content; added as a text child when the component has none (e.g. VCol)'),
  style: z
    .union([z.string(), z.record(z.string(), z.string()), z.null()])
    .optional()
    .describe('Inline style: CSS string, or object merged into the current style (null removes it)'),
  attrs: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Extra attributes/props merged into props (null removes one), e.g. { "aria-label": "Close" }'),
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

const pageRef = z.string().describe('Page id or path')
tool('list_pages', 'List pages (id, name, path), whether a shared layout exists and what is being edited.', {})
tool('add_page', 'Add a page and switch the editor to it. Path defaults to a slug of the name.', {
  name: z.string(),
  path: z.string().optional().describe('Route such as /orders'),
})
tool('set_route', 'Rename a page or change its route.', {
  id: pageRef,
  name: z.string().optional(),
  path: z.string().optional(),
})
tool('select_page', 'Switch the editor to a page; later add_component calls edit that page.', { id: pageRef })
tool('delete_page', 'Delete a page (the last page cannot be deleted).', { id: pageRef })
tool(
  'edit_layout',
  'Edit the shared layout (created on first use: app bar, navigation drawer, main with the Page content outlet) or return to the active page.',
  { enabled: z.boolean().optional().describe('true (default) edits the layout, false goes back to the page') },
)
tool('set_state', 'Define or change a state variable used by bindings and events. A null value removes it.', {
  name: z.string(),
  value: z.unknown(),
})
tool(
  'set_binding',
  'Set bindings on a node: model (state key for v-model), vIf (key, !key, key == value), vFor (state key of an array or number; use {{item.field}} and {{index}} inside). Empty string clears one.',
  {
    id,
    model: z.string().optional(),
    vIf: z.string().optional(),
    vFor: z.string().optional(),
  },
)
tool('set_event', 'Set what a click does in preview, or null to clear.', {
  id,
  click: z.union([
    z.object({ type: z.literal('navigate'), to: z.string().describe('Page path') }),
    z.object({ type: z.literal('set'), key: z.string(), value: z.string().describe('JSON or text') }),
    z.object({ type: z.literal('toggle'), key: z.string() }),
    z.null(),
  ]),
})

const columnKey = z.string().describe('Column key (the field name used in rows)')
tool(
  'describe_component',
  'Describe a component type: its slots, default props and every setting (prop name, kind, allowed options). Use before update_node to customize any component.',
  { type: z.string() },
)
tool(
  'get_table',
  'Get a data table: columns, rows, cell content, current settings and the settings you can change with update_node (density, striped, bordered, headerColor, height, …).',
  { id },
)
tool('add_table_column', 'Add a column to a data table (manual data only).', {
  id,
  key: z.string().optional().describe('Field name; generated when omitted'),
  title: z.string().optional(),
  align: z.enum(['start', 'center', 'end']).optional(),
  sortable: z.boolean().optional(),
  chip: z.boolean().optional().describe('Show the value as a colored status chip'),
  width: z.number().optional().describe('Pixels'),
})
tool('update_table_column', 'Change a column. Renaming key moves its row values and cell content too.', {
  id,
  column: columnKey,
  key: z.string().optional(),
  title: z.string().optional(),
  align: z.enum(['start', 'center', 'end']).optional(),
  sortable: z.boolean().optional(),
  chip: z.boolean().optional(),
  width: z.number().optional(),
})
tool('remove_table_column', 'Remove a column with its row values and cell content.', { id, column: columnKey })
tool('add_table_row', 'Add a row. values maps column keys to values; index defaults to the end.', {
  id,
  values: z.record(z.string(), z.unknown()).optional(),
  index: z.number().optional(),
})
tool('update_table_row', 'Change values of the row at index (0-based).', {
  id,
  index: z.number(),
  values: z.record(z.string(), z.unknown()),
})
tool('remove_table_row', 'Remove the row at index (0-based).', { id, index: z.number() })

await server.connect(new StdioServerTransport())
