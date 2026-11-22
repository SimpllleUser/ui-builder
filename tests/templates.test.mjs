import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, parseProject, parseDocument, store } from './support.mjs'

test('all starter templates survive validated export and import', () => {
  for (const kind of ['card', 'form', 'columns']) store.addTemplate(kind)
  assert.equal(parseDocument(store.exportDocument()).children.length, 3)
})

test('starter templates: dashboard, table page and sign-in form come ready with their variables and behavior', async () => {
  const { TEMPLATES } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/templateFactory.ts')
  assert.deepEqual(
    TEMPLATES.map(template => template.kind),
    ['card', 'form', 'columns', 'dashboard', 'table', 'login'],
  )
  const types = node => [node.type, ...[...node.children, ...Object.values(node.slots).flat()].flatMap(types)]

  store.addTemplate('dashboard')
  let dashboard = store.rootNode.children.at(-1)
  assert.equal(dashboard.name, 'Dashboard')
  assert.ok(types(dashboard).filter(type => type === 'VCol').length === 3 && types(dashboard).includes('VDataTable'))
  assert.deepEqual(store.project.state, {}, 'the dashboard needs no variables')
  assert.equal(store.historyVersions.at(-1).label, 'Added Dashboard')

  const before = store.historyVersions.length
  store.addTemplate('table')
  assert.equal(store.historyVersions.length, before + 1, 'template and variables are one undo step')
  assert.equal(store.historyVersions.at(-1).label, 'Added Orders page')
  assert.deepEqual(store.project.state, { query: '', selected: 'none' })
  const page = store.rootNode.children.at(-1)
  const table = page.children.find(node => node.type === 'VDataTable')
  assert.equal(table.props.search, '{{query}}')
  assert.deepEqual(table.events.click, { type: 'set', key: 'selected', value: '{{item}}' })
  const search = page.children[1].children.find(node => node.type === 'VTextField')
  assert.equal(search.model, 'query')
  assert.equal(page.children.at(-1).vIf, 'selected != none')
  store.undo()
  assert.deepEqual(store.project.state, {}, 'undo removes the variables with the template')
  store.redo()
  assert.deepEqual(store.project.state, { query: '', selected: 'none' })

  store.setStateVariable('query', 'kept')
  store.addTemplate('table')
  assert.equal(store.project.state.query, 'kept', 'an existing variable keeps its value')

  store.addTemplate('login')
  assert.deepEqual(Object.keys(store.project.state).sort(), [
    'email',
    'password',
    'query',
    'remember',
    'selected',
    'signedIn',
  ])
  const login = store.rootNode.children.at(-1)
  const button = login.children.find(node => node.type === 'VBtn')
  assert.deepEqual(button.events.click, { type: 'set', key: 'signedIn', value: 'true' })
  assert.equal(login.children.find(node => node.type === 'VAlert').vIf, 'signedIn')
  assert.deepEqual(
    login.children.filter(node => node.model).map(node => node.model),
    ['email', 'password', 'remember'],
  )

  // Everything made from templates survives export and import.
  const project = parseProject(store.exportDocument())
  assert.equal(project.pages[0].root.children.length, store.rootNode.children.length)
  // The command palette and MCP offer them too.
  const { buildCommands } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/command-palette/model/commands.ts',
  )
  const host = {
    addPage() {},
    renameCurrentPage() {},
    importProject() {},
    exportProject() {},

    startTour() {},
    toggleFocus() {},
    togglePanel() {},
    modifierKey: 'Ctrl',
  }
  const commands = buildCommands(store, host).filter(command => command.group === 'Templates')
  assert.equal(commands.length, 6)
  const count = store.rootNode.children.length
  commands.find(command => command.id === 'template:dashboard').run()
  assert.equal(store.rootNode.children.length, count + 1)
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  executeMcpCommand(store, 'add_template', { kind: 'login' })
  assert.equal(store.rootNode.children.length, count + 2)
})
