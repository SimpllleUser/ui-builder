#!/usr/bin/env node
// MCP server for UI Builder. Talks MCP over stdio and relays commands to the editor open in the browser
// through a local HTTP/SSE bridge (the document lives in the browser, not on disk).
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { takeScreenshot } from './screenshot.mjs'
import { pickTab } from './tabs.mjs'

const PORT = Number(process.env.UI_BUILDER_MCP_PORT ?? 3002)
const TIMEOUT_MS = 10_000
const RETRY_LISTEN_MS = 3_000
// Open editor tabs by their event stream: the tab's id, when its page was loaded, the address it is served from and
// whether it edits its project now.
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
    clients.set(res, {
      id: url.searchParams.get('tab'),
      loaded: Number(url.searchParams.get('loaded')) || 0,
      origin: req.headers.origin,
      editing: url.searchParams.get('editing') !== 'false',
    })
    req.on('close', () => clients.delete(res))
    return
  }
  // A tab says when it starts or stops editing its project, such as after “Edit here” in another tab.
  if (req.url === '/tab' && req.method === 'POST') {
    let data = ''
    req.on('data', c => {
      data += c
    })
    req.on('end', () => {
      try {
        const { tab, editing } = JSON.parse(data)
        for (const client of clients.values()) if (client.id === tab) client.editing = editing === true
      } catch {}
      res.writeHead(204).end()
    })
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
/** Why the editor cannot connect to this server, or null when it can. */
let bridgeProblem = null
const listen = () => bridge.listen(PORT, '127.0.0.1')
bridge.on('listening', () => {
  bridgeProblem = null
  console.error(`[ui-builder-mcp] bridge on http://127.0.0.1:${PORT}`)
})
bridge.on('error', e => {
  console.error(`[ui-builder-mcp] bridge failed: ${e.message}`)
  if (e.code !== 'EADDRINUSE') {
    bridgeProblem = `The bridge to the editor failed: ${e.message}`
    return
  }
  bridgeProblem = `Port ${PORT} is held by another process, most likely the MCP server of another session, so the editor is connected to that one. Close it and this server takes the port over within a few seconds.`
  // Unref: waiting for the port must not keep a finished session's server alive.
  setTimeout(listen, RETRY_LISTEN_MS).unref()
})
listen()

/** The event stream of the tab that gets the commands, with what is known about it; empty when none is open. */
const currentTab = () => {
  const best = pickTab(clients.values())
  return [...clients].find(([, tab]) => tab === best) ?? []
}

function call(command, args = {}) {
  if (bridgeProblem) return Promise.reject(new Error(bridgeProblem))
  const [client] = currentTab()
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
      'Edits the project open in the UI Builder editor. Read the ui-builder://guide resource first. Build with add_subtree or batch (one Undo step), style with set_style, look at the result with preview_screenshot, then run check_project and try the page with preview_start and preview_click.',
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
  'Set the style of an element the way the Design tab does: numbers are px ({ padding: 16 }), kebab-case names are fine, theme colour names (primary, surface, on-primary…) follow light/dark mode, theme tokens follow the theme (space-xs, space-sm, space-md, space-lg, space-xl, space-2xl for margin, padding and gap; radius-sm, radius-md, radius-lg, radius-full for borderRadius; textStyle: h1-h6, body or caption), and every value wins over utility classes. Screen sizes follow Vuetify, mobile first: without breakpoint (or with xs) it is the base style; sm, md, lg or xl change only what differs from that width up. A property set to null is removed; style null clears the named breakpoint, or every style when none is named. Returns the base style and the per-breakpoint changes.',
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
  'Insert a starter template. dashboard: key numbers and a table. table: search, status filter, table and a details panel (adds variables query and selected). login: sign-in form that reacts in Preview (adds variables email, password, remember, signedIn). testimonials, faq, onboarding (variables step, onboarded), blog, contact (variables contactName, contactEmail, contactMessage, contactSent) and footer are content sections. Pass props to customize: testimonials { title, quotes: [{ quote, author, role }] }; faq { title, variant, questions: [{ question, answer }] }; onboarding { finishLabel, steps: [{ title, text, icon }] }; blog { title, subtitle, readMoreLabel, posts: [{ tag, title, excerpt, date }] }; contact { title, text, email, phone, address, submitLabel, successMessage }; footer { brand, tagline, copyright, columns: [{ title, links: [text] }] }. landing { title, text, primaryLabel, secondaryLabel, features: [{ title, text, icon }], ctaTitle, ctaLabel }; settings (a settings form; adds variables settingsName, settingsEmail, settingsNewsletter, settingsAlerts, settingsLanguage) { title, text, saveLabel, savedMessage }; wizard (three checked steps; adds wizardStep, wizardName, wizardEmail, wizardPlan) { title, accountTitle, planTitle, reviewTitle, finishLabel, successMessage, plans: [text], stepLabel (with {number} and {total}), nameLabel, emailLabel, planLabel, backLabel, nextLabel, restartLabel }; pricing { title, subtitle, featured, plans: [{ name, price, period, description, features, button }] } with features separated by ;. What is not given keeps its default.',
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
      'landing',
      'settings',
      'wizard',
      'pricing',
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
const action = z.union([
  z.object({ type: z.literal('navigate'), to: z.string().describe('Page path') }),
  z.object({ type: z.literal('set'), key: z.string(), value: z.string().describe('JSON or text') }),
  z.object({ type: z.literal('toggle'), key: z.string() }),
  z.object({ type: z.literal('append'), key: z.string().describe('List variable'), value: z.string() }),
  z.object({ type: z.literal('remove'), key: z.string().describe('List variable'), value: z.string() }),
  z.object({ type: z.literal('notify'), message: z.string() }),
  z.object({ type: z.literal('resetForm') }),
])
const actions = z.union([action, z.array(action), z.null()]).optional()
tool(
  'set_event',
  'Set what events of an element do in preview. Each is one action, a list that runs in order, or null to clear; events not given stay. click: any element (a table row gives {{item}}). change: form fields and controls ({{value}}). submit: VForm, only when its rules pass; the button needs props type "submit". mounted: when the element appears. resetForm resets the surrounding form.',
  { id, click: actions, change: actions, submit: actions, mounted: actions },
)
const rules = z.union([
  z.array(
    z.object({
      type: z.enum(['required', 'email', 'minLength', 'maxLength', 'min', 'max']),
      value: z.union([z.string(), z.number()]).optional(),
      message: z.string().optional(),
    }),
  ),
  z.null(),
])
tool(
  'set_rules',
  'Set the validation rules of a form field (replaces them; null clears). value is the number a length or min/max rule compares with.',
  { id, rules },
)
tool(
  'set_computed',
  'Define a variable worked out from others, e.g. total = length(rows) or fullName = first + " " + last. Operators of conditions and length, empty, contains, lower. null removes it.',
  { name: z.string(), expression: z.union([z.string(), z.null()]) },
)
tool(
  'set_data_source',
  'Load a variable from a mock REST endpoint: its starting value (set_state) is the answer. Preview starts empty, waits delayMs, then fills it without sending a request; loadingVariable is true meanwhile. Exported code uses fetch(url). url null removes it.',
  {
    name: z.string().describe('Existing variable'),
    url: z.union([z.string(), z.null()]).describe('Path such as /api/orders, or an http(s) address'),
    delayMs: z.number().optional(),
    loadingVariable: z.string().optional(),
  },
)
const copyNumber = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe('Which copy of a repeated element, 0-based in the order shown')
tool('preview_submit', 'Submit a form in Preview. Returns the broken rules, or runs the submit actions.', {
  id,
  copy: copyNumber,
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
      .union([action, z.array(action)])
      .optional()
      .describe('Short for events.click'),
    events: z.object({ click: actions, change: actions, submit: actions, mounted: actions }).optional(),
    rules: rules.optional().describe('Validation rules of a form field'),
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
  'Run several tools as one Undo step; if a step fails, all earlier steps are undone. Later steps can use earlier results: "$0.id" is the id returned by step 0. Steps: [{ tool: "add_component", args: {...} }, ...]. Not allowed: undo, redo, import_document, edit_saved_component, close_saved_component, the theme tools and the project tools.',
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
  "The named steps of the history (newest first, with index) and the checkpoints. Use before a risky change, or to see what was done. While the person edits a saved component, the steps are that component's (see scope), and undo, redo and restore_version act on them.",
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
  'Insert an instance of a saved component into a container (defaults to where the editor would insert). It follows the original: when the saved component changes, every instance changes, and its content cannot be edited. `props` sets its parameters (see list_saved_components); missing ones use their defaults.',
  { prefabId: z.string(), parentId: z.string().optional(), slot, props: propValues },
)
tool(
  'update_instance',
  'Change parameter values of a component instance; the parameters not given keep their values.',
  { id, props: z.record(z.string(), z.string()) },
)
tool('detach_instance', 'Turn a component instance into an ordinary copy that no longer follows its original.', { id })
tool(
  'get_theme',
  'The theme of the open project (mode, colours, corner radius, spacing, typography, fonts…), what every setting accepts, and the design presets. Spacing, radius and typography decide what the theme tokens (space-md, radius-lg, textStyle) stand for.',
  {},
)
tool(
  'set_theme',
  'Change theme settings of the open project; settings not named stay. { preset } applies a whole design preset first. Giving customPrimary or customSecondary switches to custom colours. radius null keeps each component\'s own. extraColors adds colours of your own ({ "cobalt": "#1B3FD1" }, null removes one): use them as color="cobalt" on a component or theme-cobalt in set_style. An unknown name or value changes nothing. Not an undo step and not allowed in batch: read get_theme first to be able to put it back.',
  {
    settings: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.null(), z.record(z.string(), z.string().nullable())]),
    ),
  },
)
tool(
  'edit_saved_component',
  'Open the original of a saved component. Until close_saved_component, the editing tools (add, update, style, events, undo, get_history, preview…) work on it, and every instance follows each change. Its root is what get_document returns. Write {{props.name}} to add a parameter. Refused while another tab edits it. Cannot be used in batch.',
  { prefabId: z.string() },
)
tool('close_saved_component', 'Leave the saved component and return to the page or layout.', {})
tool(
  'delete_saved_component',
  'Delete a saved component. Its instances stay as ordinary copies. undo right after brings it back, restore_saved_component later.',
  { prefabId: z.string() },
)
tool('list_deleted_components', 'Saved components deleted lately (up to 10), newest first.', {})
tool(
  'restore_saved_component',
  'Bring a deleted saved component back with its history. Its instances follow it again; copies edited meanwhile stay copies.',
  { prefabId: z.string() },
)
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
const PHONE_WIDTH = 390
server.registerTool(
  'preview_screenshot',
  {
    description: `A picture of a page as Preview shows it, with the project's theme. Use it to check your design: look at what you built, and again at width ${PHONE_WIDTH} for a phone. While Preview runs, it shows the current page and variables (after your clicks and input); otherwise the page open in the editor with starting values. Data that has not arrived yet in Preview shows as loading. Does not touch the person's editor. Needs Chrome on this computer.`,
    inputSchema: {
      path: z.string().optional().describe('Route of the page, e.g. /tickets; default: the page shown'),
      width: z.number().int().min(320).max(2560).optional().describe('Window width in px, default 1280'),
      height: z.number().int().min(320).max(2000).optional().describe('Window height in px, default 800'),
      fullPage: z.boolean().optional().describe('Include what is below the window (default true)'),
    },
  },
  async ({ path, width = 1280, height = 800, fullPage = true }) => {
    try {
      const source = await call('screenshot_source', path === undefined ? {} : { path })
      const origin = currentTab()[1]?.origin
      const shot = await takeScreenshot({ origin, source, width, height, fullPage })
      const note = `${source.path} at ${shot.width}×${shot.height}px`
      const cut = shot.contentHeight > shot.height && fullPage ? ' (cut off: the page is taller)' : ''
      return {
        content: [
          { type: 'image', data: shot.data, mimeType: 'image/png' },
          { type: 'text', text: note + cut },
        ],
      }
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e.message }] }
    }
  },
)
tool('preview_state', 'What Preview shows now: variables, texts, hidden elements, inputs, table rows.', {})
tool(
  'preview_click',
  'Click an element in Preview. For a table with a row click action pass row (0-based). Refused for an element a person could not click: hidden by a condition or disabled. For an element a repeat shows several times, pass copy: 0 is the first one shown.',
  {
    id,
    row: z.number().optional(),
    copy: copyNumber,
  },
)
tool('preview_input', 'Type into an input in Preview (sets the variable it is linked to).', {
  id,
  value: z.unknown(),
  copy: copyNumber,
})
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
