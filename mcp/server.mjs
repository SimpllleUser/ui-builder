#!/usr/bin/env node
// MCP server for UI Builder. Talks MCP over stdio and relays commands to the editor open in the browser
// through a local HTTP/SSE bridge (the document lives in the browser, not on disk).
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const PORT = Number(process.env.UI_BUILDER_MCP_PORT ?? 3002)
const TIMEOUT_MS = 10_000
// Open editor tabs, each with the time its page was loaded.
const clients = new Map()
const pending = new Map()

const bridge = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    res.write(': connected\n\n')
    clients.set(res, Number(url.searchParams.get('loaded')) || 0)
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
  // The most recently loaded tab is the one the person has just opened or reloaded. An old tab left open must not take
  // the commands, and tabs reconnect in any order after the server restarts, so the order of connecting says nothing.
  const [client] = [...clients].sort(([, loadedA], [, loadedB]) => loadedB - loadedA)[0] ?? []
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

const GUIDE_URL = new URL('./guide.md', import.meta.url)
const GUIDE = readFileSync(GUIDE_URL, 'utf8')
const server = new McpServer(
  { name: 'ui-builder', version: '0.2.0' },
  {
    instructions:
      'Edits the project open in the UI Builder editor. Read the ui-builder://guide resource first. Build with add_subtree or batch (one Undo step), style with set_style, then run check_project and try the page with preview_start and preview_click.',
  },
)
server.registerResource(
  'guide',
  'ui-builder://guide',
  { title: 'How to build pages with UI Builder', mimeType: 'text/markdown' },
  async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: GUIDE }] }),
)
server.registerPrompt(
  'build_page',
  { description: 'Build a page from a description, then check and try it.', argsSchema: { description: z.string() } },
  ({ description }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Read the ui-builder://guide resource. Then build this in UI Builder: ${description}\nUse add_subtree or batch, finish with check_project (fix every error) and try the main flow with preview_start and preview_click.`,
        },
      },
    ],
  }),
)
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
    .union([z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.null()]))])
    .optional()
    .describe(
      'Inline style: CSS string or object. Numbers are px, theme colour names (primary…) work, values beat classes.',
    ),
  attrs: z.record(z.string(), z.unknown()).optional().describe('Extra attributes/props merged into props'),
})
tool('update_node', 'Change a node. props are merged; a null prop value removes it; classes replaces all classes.', {
  id,
  name: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  classes: z.array(z.string()).optional(),
  text: z.string().optional().describe('Text content; added as a text child when the component has none (e.g. VCol)'),
  style: z
    .union([z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.null()])), z.null()])
    .optional()
    .describe(
      'Inline style: CSS string, or object merged into the current style (null removes it, or one property). Numbers are px, theme colour names work, values beat classes.',
    ),
  attrs: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Extra attributes/props merged into props (null removes one), e.g. { "aria-label": "Close" }'),
})
tool(
  'set_style',
  'Set the style of an element the way the Design tab does: numbers are px ({ padding: 16 }), kebab-case names are fine, theme colour names (primary, surface, on-primary…) follow light/dark mode, and every value wins over utility classes. Screen sizes follow Vuetify, mobile first: without breakpoint (or with xs) it is the base style; sm, md, lg or xl change only what differs from that width up. A property set to null is removed; style null clears the named breakpoint, or every style when none is named. Returns the base style and the per-breakpoint changes.',
  {
    id,
    style: z.union([z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.null()])), z.null()]),
    breakpoint: z
      .enum(['xs', 'sm', 'md', 'lg', 'xl'])
      .optional()
      .describe('Vuetify breakpoint: sm from 600px, md 960, lg 1280, xl 1920. Omit or xs for the base style.'),
  },
)
tool('delete_node', 'Delete a node and its subtree.', { id })
tool('move_node', 'Move a node into another container.', { id, parentId: z.string(), slot })
tool('duplicate_node', 'Duplicate a node next to the original.', { id })
tool(
  'add_template',
  'Insert a starter template. dashboard: key numbers and a table. table: search, status filter, table and a details panel (adds variables query and selected). login: sign-in form that reacts in Preview (adds variables email, password, remember, signedIn). testimonials, faq, onboarding (variables step, onboarded), blog, contact (variables contactName, contactEmail, contactMessage, contactSent) and footer are content sections. Pass props to customize: testimonials { title, quotes: [{ quote, author, role }] }; faq { title, variant, questions: [{ question, answer }] }; onboarding { finishLabel, steps: [{ title, text, icon }] }; blog { title, subtitle, readMoreLabel, posts: [{ tag, title, excerpt, date }] }; contact { title, text, email, phone, address, submitLabel, successMessage }; footer { brand, tagline, copyright, columns: [{ title, links: [text] }] }. What is not given keeps its default.',
  {
    kind: z.enum([
      'card',
      'form',
      'columns',
      'dashboard',
      'table',
      'login',
      'testimonials',
      'faq',
      'onboarding',
      'blog',
      'contact',
      'footer',
    ]),
    props: z.record(z.string(), z.unknown()).optional().describe('Settings of the template, see the description'),
  },
)
tool('select_node', 'Select a node in the editor (omit id to clear).', { id: z.string().optional() })
tool('undo', 'Undo the last change.', {})
tool('redo', 'Redo the last undone change.', {})
tool('export_document', 'Export the open project as JSON text, its theme included.', {})
tool(
  'import_document',
  'Replace the open project with exported JSON. Undo brings the content back, but not a theme the JSON carried.',
  { json: z.string() },
)

const projectRef = z.string().describe('Project id or exact name')
tool('list_projects', 'The projects saved in this browser, and which one is open.', {})
tool('create_project', 'Create an empty project and open it. Later tools edit this project.', {
  name: z.string().describe('A name no other project has'),
})
tool(
  'open_project',
  'Open another project; later tools edit it. When lockedElsewhere is true, another tab edits it and editor tools are refused here.',
  { id: projectRef },
)
tool('rename_project', 'Rename a project.', { id: projectRef, name: z.string() })

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
tool('duplicate_page', 'Duplicate a page (all its elements) and switch the editor to the copy.', { id: pageRef })
tool('move_page', 'Move a page one place left or right in the tab order.', {
  id: pageRef,
  direction: z.enum(['left', 'right']),
})
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

const subtree = z.lazy(() =>
  z.object({
    type: z.string().describe('Component type, e.g. VCard, VBtn, div'),
    name: z.string().optional(),
    ref: z.string().optional().describe('Your name for this element; the answer maps it to its id'),
    text: z.string().optional().describe('Text of a button, heading, column…'),
    props: z.record(z.string(), z.unknown()).optional(),
    classes: z.array(z.string()).optional(),
    style: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
    model: z.string().optional().describe('Variable linked to an input'),
    vIf: z.string().optional(),
    vFor: z.string().optional(),
    click: z
      .object({
        type: z.enum(['navigate', 'set', 'toggle']),
        to: z.string().optional(),
        key: z.string().optional(),
        value: z.string().optional(),
      })
      .optional(),
    children: z.array(subtree).optional(),
    slots: z.record(z.string(), z.array(subtree)).optional(),
  }),
)
tool(
  'add_subtree',
  'Build a whole nested tree in one call (one Undo step; nothing is added if any element is invalid). Returns { id, refs } where refs maps each element ref to its node id. Prefer this to many add_component calls.',
  { tree: subtree, parentId: z.string().optional().describe('Container id; defaults to the page root'), slot },
)
tool(
  'batch',
  'Run several tools as one Undo step; if a step fails, all earlier steps are undone. Later steps can use earlier results: "$0.id" is the id returned by step 0. Steps: [{ tool: "add_component", args: {...} }, ...]. Not allowed: undo, redo, import_document and the project tools.',
  {
    steps: z
      .array(z.object({ tool: z.string(), args: z.record(z.string(), z.unknown()).optional() }))
      .min(1)
      .max(100),
  },
)
tool(
  'check_project',
  'Find problems without running anything: unknown variables, links to missing pages, invalid conditions, empty tables, a layout without Page content, unused variables. Each issue names the page and node.',
  {},
)
tool(
  'get_status',
  'Where the editor is: project, current page, variables, selection, whether Preview runs, undo/redo, counts of saved components and checkpoints. Cheap; use it to check the editor is connected.',
  {},
)
tool(
  'get_history',
  'The named steps of the history (newest first, with index) and the checkpoints. Use before a risky change, or to see what was done.',
  {},
)
tool(
  'create_checkpoint',
  'Save the whole project under a name so you can come back to it with restore_checkpoint. Do this before a big change.',
  { name: z.string() },
)
tool(
  'restore_checkpoint',
  'Put the project back as it was at a checkpoint. This is one Undo step, so undo brings the current state back.',
  { checkpointId: z.string() },
)
tool('delete_checkpoint', 'Delete a checkpoint.', { checkpointId: z.string() })
tool('restore_version', 'Go back to a step of the history by its index (see get_history).', { index: z.number() })
tool('list_saved_components', 'The elements saved in My components, with their ids.', {})
const propValues = z.record(z.string(), z.string()).optional()
tool(
  'save_component',
  'Save an element (with its children) in My components for reuse. Every {{props.name}} inside it becomes a parameter; `props` gives their default values.',
  { id, name: z.string(), props: propValues },
)
tool(
  'insert_saved_component',
  'Insert a saved component into a container (defaults to where the editor would insert). `props` sets its parameters (see list_saved_components); missing ones use their defaults.',
  { prefabId: z.string(), parentId: z.string().optional(), slot, props: propValues },
)
tool('delete_saved_component', 'Delete a saved component.', { prefabId: z.string() })
tool(
  'wrap_nodes',
  'Put sibling elements into a new container (for example VContainer, VRow, VCard, div). Returns the container id.',
  { ids: z.array(z.string()).min(1), type: z.string() },
)
tool('unwrap_node', 'Replace a container by its children.', { id })
tool(
  'preview_start',
  'Start Preview from the initial variable values and return what is shown: variables, texts, hidden elements, inputs and tables.',
  {},
)
tool('preview_state', 'What Preview shows now: variables, texts, hidden elements, inputs, table rows.', {})
tool('preview_click', 'Click an element in Preview. For a table with a row click action pass row (0-based).', {
  id,
  row: z.number().optional(),
})
tool('preview_input', 'Type into an input in Preview (sets the variable it is linked to).', { id, value: z.unknown() })
tool('preview_navigate', 'Go to a page by route in Preview.', { path: z.string() })
tool('preview_reset', 'Put every variable back to its starting value and return to the first page.', {})
tool('preview_stop', 'Leave Preview and return to editing.', {})

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
