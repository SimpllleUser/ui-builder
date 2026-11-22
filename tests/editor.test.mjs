import { test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
let server,
  useStore,
  parseProject,
  serializeProject,
  runtime,
  parseDocument,
  serializeDocument,
  readSpacing,
  writeSpacing,
  readFlex,
  writeFlex,
  groupNodes,
  ungroupNode,
  clonePaletteItem,
  parseMoveDestination,
  canSavePrefabName,
  store
const storage = new Map()
before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  })
  ;({ useUiTreeStore: useStore } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/store.ts',
  ))
  ;({ parseProject, serializeProject } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/document.ts',
  ))
  runtime = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/runtime.ts')
  // Single-page helpers: tests edit one page tree and import it as a v1 document (also exercises migration).
  parseDocument = text => parseProject(text).pages[0].root
  serializeDocument = root => JSON.stringify({ version: 1, root })
  ;({ readSpacing, writeSpacing, readFlex, writeFlex } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/layoutControls.ts',
  ))
  ;({ groupNodes, ungroupNode } = await server.ssrLoadModule('/src/features/ui-builder/model/treeOperations.ts'))
  ;({ clonePaletteItem } = await server.ssrLoadModule('/src/features/ui-builder/model/useClone.ts'))
  ;({ parseMoveDestination, canSavePrefabName } = await server.ssrLoadModule(
    '/src/modules/ui-builder/widgets/property-panel/model/propertyPanelUtils.ts',
  ))
  global.window = { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }
})
beforeEach(() => {
  storage.clear()
  setActivePinia(createPinia())
  store = useStore()
})
afterEach(() => store.$dispose())
after(async () => {
  delete global.window
  await server.close()
})

test('immediate undo preserves inserted component and redo restores the property edit', () => {
  store.addComponent('div')
  const id = store.selectedNodeId
  store.findNodeById(id).name = 'Edited'
  store.undo()
  assert.equal(store.findNodeById(id).name, 'Box (div)')
  store.redo()
  assert.equal(store.findNodeById(id).name, 'Edited')
})
test('structural actions do not swallow pending property edits', () => {
  store.addComponent('div')
  const id = store.selectedNodeId
  store.findNodeById(id).name = 'Edited'
  store.duplicateNode(id)
  store.undo()
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.findNodeById(id).name, 'Edited')
  store.undo()
  assert.equal(store.findNodeById(id).name, 'Box (div)')
})
test('a new edit after undo invalidates redo', () => {
  store.addComponent('div')
  store.addComponent('VBtn', 'root-canvas')
  store.undo()
  store.rootNode.name = 'New page'
  assert.equal(store.canRedo, false)
})
test('save and restore include complete document and slot contents', () => {
  store.addComponent('VCard')
  const card = store.selectedNodeId
  store.appendToSlot(card, 'title', store.createNode('TEXT', 'Title'))
  store.saveDocument()
  const saved = store.exportDocument()
  const next = useStore(createPinia())
  assert.equal(next.exportDocument(), saved)
  next.$dispose()
})
test('import is undoable and invalid import preserves the current page', () => {
  store.addTemplate('form')
  const saved = store.exportDocument()
  const doc = parseDocument(saved)
  doc.name = 'Imported'
  store.importDocument(serializeDocument(doc))
  assert.equal(store.rootNode.name, 'Imported')
  store.undo()
  assert.equal(store.exportDocument(), saved)
  assert.throws(() => store.importDocument('{ broken'))
  assert.equal(store.exportDocument(), saved)
  const invalid = parseDocument(saved)
  invalid.children[0].id = 'root-canvas'
  assert.throws(() => store.importDocument(serializeDocument(invalid)), /Invalid component/)
  assert.equal(store.exportDocument(), saved)
})
test('unwrap refuses named slot content without losing data; regular unwrap and undo retain children', () => {
  store.addComponent('VCard')
  const id = store.selectedNodeId
  const child = store.createNode('div')
  store.appendChild(id, child)
  const title = store.createNode('TEXT', 'Keep me')
  store.appendToSlot(id, 'title', title)
  const before = store.exportDocument()
  assert.equal(store.unwrapNode(id), false)
  assert.equal(store.exportDocument(), before)
  store.moveNode(title.id, 'root-canvas')
  assert.equal(store.unwrapNode(id), true)
  assert.ok(store.findNodeById(child.id))
  assert.ok(store.findNodeById(title.id))
  store.undo()
  assert.ok(store.findNodeById(id))
})
test('prefab selected on a leaf inserts into the nearest container and selects the new copy', () => {
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.savePrefab(button, 'Action')
  store.addComponent('VIcon', 'root-canvas')
  const icon = store.selectedNodeId
  store.insertPrefab(store.prefabs[0].prefabId, icon)
  assert.equal(store.findNodeById(icon).children.length, 0)
  assert.equal(store.rootNode.children.length, 3)
  assert.equal(store.findNodeById(store.selectedNodeId).type, 'VBtn')
  assert.notEqual(store.selectedNodeId, button)
})
test('moves reject cycles and invalid containers, and support named slots', () => {
  store.addComponent('VCard')
  const card = store.selectedNodeId
  store.addComponent('div')
  const box = store.selectedNodeId
  store.addComponent('VIcon', 'root-canvas')
  const icon = store.selectedNodeId
  assert.equal(store.moveNode(card, box), false)
  assert.equal(store.moveNode(box, icon), false)
  assert.equal(store.moveNode(box, card, 'title'), true)
  assert.equal(store.findNodeById(card).slots.title[0].id, box)
})
test('deleting a parent clears selection of its descendants', () => {
  store.addComponent('div')
  const parent = store.selectedNodeId
  store.addComponent('VBtn')
  const child = store.selectedNodeId
  store.deleteNode(parent)
  assert.equal(store.selectedNodeIds.length, 0)
  assert.equal(store.findNodeById(child), null)
})
test('zero spacing overrides shorthand while preserving other sides', () => {
  const classes = writeSpacing(['ma-4', 'd-flex'], 'm', 't', 0)
  assert.equal(readSpacing(classes, 'm', 't'), 0)
  assert.equal(readSpacing(classes, 'm', 'b'), 4)
  assert.ok(classes.includes('mt-0'))
  assert.ok(!classes.includes('ma-4'))
  assert.equal(readSpacing(writeSpacing(classes, 'm', 't', null), 'm', 't'), null)
})
test('flex controls round-trip direction without removing grow and wrapping', () => {
  const classes = writeFlex(['d-block', 'flex-grow-1', 'flex-wrap'], 'd-flex flex-column')
  assert.equal(readFlex(classes), 'd-flex flex-column')
  assert.ok(classes.includes('flex-grow-1'))
  assert.ok(classes.includes('flex-wrap'))
})
test('all starter templates survive validated export and import', () => {
  for (const kind of ['card', 'form', 'columns']) store.addTemplate(kind)
  assert.equal(parseDocument(store.exportDocument()).children.length, 3)
})
test('composite palette components create useful named children', () => {
  const form = store.createNode('VForm')
  assert.deepEqual(
    form.children.map(child => child.props.label ?? child.children[0]?.name),
    ['Name', 'Email', 'Submit'],
  )
  assert.equal(form.children[1].props.type, 'email')

  const radioGroup = store.createNode('VRadioGroup')
  assert.deepEqual(
    radioGroup.children.map(child => child.props.value),
    ['option-1', 'option-2'],
  )
  assert.deepEqual(
    radioGroup.children.map(child => child.children[0]?.name),
    ['Option 1', 'Option 2'],
  )
})
test('form can be inserted into the canvas as a composite component', () => {
  store.addComponent('VForm')
  const form = store.rootNode.children.at(-1)
  assert.equal(form.type, 'VForm')
  assert.deepEqual(
    form.children.map(child => child.type),
    ['VTextField', 'VTextField', 'VBtn'],
  )
})
test('history restores a selected version without losing newer history', () => {
  store.addComponent('VForm')
  const formVersion = store.exportDocument()
  store.addComponent('VSlider', 'root-canvas')
  assert.equal(store.rootNode.children.length, 2)

  const initialVersion = store.historyVersions.find(version => version.index === 0)
  store.restoreHistoryVersion(initialVersion.index)
  assert.equal(store.rootNode.children.length, 0)
  assert.notEqual(store.exportDocument(), formVersion)
  assert.equal(store.canRedo, true)
})
test('checkpoints create and restore a named document snapshot', () => {
  store.addComponent('VForm', 'root-canvas')
  assert.equal(store.createCheckpoint('Contact form draft'), true)
  const checkpoint = store.checkpoints[0]
  store.addComponent('VSlider', 'root-canvas')
  assert.equal(store.rootNode.children.length, 2)

  assert.equal(store.restoreCheckpoint(checkpoint.checkpointId), true)
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.rootNode.children[0].type, 'VForm')
  store.deleteCheckpoint(checkpoint.checkpointId)
  assert.equal(store.checkpoints.length, 0)
})

test('legacy tree operations group siblings, preserve order, and ungroup cleanly', () => {
  const nodes = [
    { id: 1, name: 'VBtn', props: {}, children: [] },
    { id: 2, name: 'VChip', props: {}, children: [] },
    { id: 3, name: 'VAlert', props: {}, children: [] },
  ]
  const wrapper = groupNodes(nodes, [3, 1], children => ({ id: 10, name: 'Div', props: {}, children }))
  assert.equal(wrapper.id, 10)
  assert.deepEqual(
    nodes.map(node => node.id),
    [10, 2],
  )
  assert.deepEqual(
    wrapper.children.map(node => node.id),
    [1, 3],
  )
  assert.deepEqual(
    ungroupNode(nodes, 10).map(node => node.id),
    [1, 3],
  )
  assert.deepEqual(
    nodes.map(node => node.id),
    [1, 3, 2],
  )
})

test('legacy clone copies props without copying child references', () => {
  const original = {
    id: 1,
    name: 'Div',
    type: 'div',
    props: { class: 'box', nested: { active: true } },
    children: [{ id: 2, name: 'VBtn', type: 'button', props: {} }],
  }
  const clone = clonePaletteItem(original)
  assert.notEqual(clone.id, original.id)
  assert.deepEqual(clone.props, original.props)
  assert.notEqual(clone.props, original.props)
  assert.deepEqual(clone.children, [])
})

test('document validation rejects damaged nodes and invalid slot structure', () => {
  store.addComponent('VIcon')
  const valid = JSON.parse(store.exportDocument())

  const leafChildren = structuredClone(valid)
  leafChildren.pages[0].root.children[0].children = [
    { id: 'nested', type: 'TEXT', name: 'Text', props: {}, classes: [], children: [], slots: {} },
  ]
  assert.throws(() => parseDocument(JSON.stringify(leafChildren)), /unsupported children/)

  const invalidSlot = structuredClone(valid)
  invalidSlot.pages[0].root.slots = { missing: [] }
  assert.throws(() => parseDocument(JSON.stringify(invalidSlot)), /Invalid component slot/)

  const duplicateId = structuredClone(valid)
  duplicateId.pages[0].root.children[0].id = duplicateId.pages[0].root.id
  assert.throws(() => parseDocument(JSON.stringify(duplicateId)), /Invalid component data/)
})

test('move target and save dialog helpers reject malformed or empty values', () => {
  assert.deepEqual(parseMoveDestination('["root-canvas",null]'), { parentId: 'root-canvas', slot: null })
  assert.deepEqual(parseMoveDestination('["card","title"]'), { parentId: 'card', slot: 'title' })
  for (const value of ['', '{broken', '[]', '[1,null]', '["root",3]']) assert.equal(parseMoveDestination(value), null)
  assert.equal(canSavePrefabName('   '), false)
  assert.equal(canSavePrefabName(' Action '), true)
})

test('property updates and empty-container boundaries are safe', () => {
  store.addComponent('VRow')
  const row = store.selectedNodeId
  assert.equal(store.canContain(store.findNodeById(row)), true)
  assert.equal(store.appendToSlot(row, 'title', store.createNode('TEXT', 'Wrong slot')), false)
  assert.equal(store.findNodeById(row).children.length, 0)

  store.updateNodeProp(row, 'density', 'comfortable')
  store.updateNodeClasses(row, ['d-flex', 'pa-2'])
  store.updateNodeName(row, 'Layout row')
  assert.equal(store.findNodeById(row).props.density, 'comfortable')
  assert.deepEqual(store.findNodeById(row).classes, ['d-flex', 'pa-2'])
  assert.equal(store.findNodeById(row).name, 'Layout row')
})

test('MCP commands edit the page through the store', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule('/src/modules/ui-builder/model/mcpCommands.ts')
  const { id } = executeMcpCommand(store, 'add_component', { type: 'VBtn', text: 'Hi', props: { color: 'primary' } })
  assert.equal(store.findNodeById(id).props.color, 'primary')
  executeMcpCommand(store, 'update_node', { id, props: { color: null }, name: 'Go' })
  assert.equal(store.findNodeById(id).name, 'Go')
  assert.equal('color' in store.findNodeById(id).props, false)
  assert.throws(() => executeMcpCommand(store, 'delete_node', { id: 'missing' }), /not found/)
  executeMcpCommand(store, 'delete_node', { id })
  assert.equal(store.findNodeById(id), null)
  assert.ok(executeMcpCommand(store, 'get_document').root.id)
})

test('v1 documents migrate into a single-page project and v2 round-trips', () => {
  const v1 = JSON.stringify({ version: 1, root: parseDocument(store.exportDocument()) })
  const project = parseProject(v1)
  assert.deepEqual(
    project.pages.map(page => page.path),
    ['/'],
  )
  assert.equal(project.layout, null)
  assert.equal(serializeProject(parseProject(serializeProject(project))), serializeProject(project))
})

test('pages: add, route validation, switching, delete and undo', () => {
  const home = store.activePage.id
  store.addComponent('VBtn')
  const orders = store.addPage('Orders')
  assert.equal(orders.path, '/orders')
  assert.equal(store.activePage.id, orders.id)
  assert.equal(store.rootNode.children.length, 0, 'new page starts empty')
  assert.equal(store.addPage('Other', '/orders'), null, 'duplicate route is rejected')
  assert.equal(store.updatePage(orders.id, { path: 'orders' }), false)
  assert.equal(store.updatePage(orders.id, { path: '/orders/list' }), true)
  store.selectPage(home)
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.deletePage(orders.id), true)
  assert.equal(store.deletePage(home), false, 'last page stays')
  store.undo()
  assert.equal(store.pages.length, 2, 'deleting a page can be undone')
})

test('shared layout is created with an outlet, edited separately and survives save and reload', () => {
  store.addComponent('VBtn')
  store.editLayout(true)
  assert.equal(store.editingLayout, true)
  const types = []
  const walk = node => {
    types.push(node.type)
    ;[...node.children, ...Object.values(node.slots).flat()].forEach(walk)
  }
  walk(store.rootNode)
  for (const type of ['VApp', 'VAppBar', 'VNavigationDrawer', 'VMain', 'PageOutlet'])
    assert.ok(types.includes(type), type)
  store.editLayout(false)
  assert.equal(store.rootNode.children[0].type, 'VBtn')
  store.saveDocument()
  const next = useStore(createPinia())
  assert.ok(next.project.layout)
  next.$dispose()
})

test('bindings, events and state are validated and persisted', () => {
  store.addComponent('VBtn')
  const id = store.selectedNodeId
  store.updateNodeLogic(id, {
    model: 'open',
    vIf: '!loading',
    vFor: 'rows',
    events: { click: { type: 'toggle', key: 'open' } },
  })
  assert.equal(store.setStateVariable('open', false), true)
  assert.equal(store.setStateVariable('__proto__', 1), false)
  const reloaded = parseProject(store.exportDocument())
  const node = reloaded.pages[0].root.children[0]
  assert.deepEqual([node.model, node.vIf, node.vFor, node.events.click.type], ['open', '!loading', 'rows', 'toggle'])
  assert.equal(reloaded.state.open, false)
  store.updateNodeLogic(id, { model: '', events: undefined })
  assert.equal('model' in store.findNodeById(id), false)
  assert.equal('events' in store.findNodeById(id), false)
  const broken = JSON.parse(store.exportDocument())
  broken.pages[0].root.children[0].events = { click: { type: 'eval', code: 'x' } }
  assert.throws(() => parseProject(JSON.stringify(broken)), /Invalid event/)
})

test('runtime resolves bindings, conditions, repeats and masks without evaluating code', () => {
  const scope = { user: { name: 'Anna' }, rows: [1, 2], count: 3, status: 'paid', open: false }
  assert.equal(runtime.interpolate('Hi {{ user.name }}!', scope), 'Hi Anna!')
  assert.deepEqual(runtime.interpolate('{{rows}}', scope), [1, 2])
  assert.equal(runtime.interpolate('{{constructor}}', scope), undefined)
  assert.equal(runtime.resolvePath('user.__proto__', scope), undefined)
  assert.equal(runtime.evaluateCondition('!open', scope), true)
  assert.equal(runtime.evaluateCondition('status == paid', scope), true)
  assert.equal(runtime.evaluateCondition('status != "paid"', scope), false)
  assert.equal(runtime.evaluateCondition('alert(1)', scope), true, 'invalid conditions show the element')
  assert.equal(runtime.evaluateCondition('count >= 3', scope), true)
  assert.equal(runtime.evaluateCondition('count > 3', scope), false)
  assert.equal(runtime.evaluateCondition('user.name == Anna', scope), true)
  const row = { id: 7, step: 2 }
  assert.equal(runtime.evaluateCondition('row.step >= 2', { row }), true)
  assert.equal(runtime.evaluateCondition('row.step >= 3', { row }), false)
  assert.deepEqual(runtime.repeatItems('rows', scope), [1, 2])
  assert.equal(runtime.repeatItems('count', scope).length, 3)
  assert.equal(runtime.applyMask('31122026', '##.##.####'), '31.12.2026')
  assert.equal(runtime.applyMask('3112', '##.##.####'), '31.12')
  assert.equal(runtime.applyMask('12ab', '##-AA'), '12-ab')
})

test('preview actions change state and navigate between pages', () => {
  store.addPage('Orders')
  store.selectPage(store.pages[0].id)
  store.setStateVariable('open', false)
  store.isPreviewMode = true
  return Promise.resolve().then(() => {
    assert.equal(store.runtimeState.open, false)
    store.dispatchAction({ type: 'toggle', key: 'open' })
    assert.equal(store.runtimeState.open, true)
    store.dispatchAction({ type: 'set', key: 'count', value: '3' })
    assert.equal(store.runtimeState.count, 3)
    store.dispatchAction({ type: 'navigate', to: '/orders' })
    assert.equal(store.previewPage.path, '/orders')
    store.dispatchAction({ type: 'navigate', to: '/missing' })
    assert.match(store.notice, /No page/)
    assert.equal(store.project.state.open, false, 'preview does not change the saved initial state')
  })
})

test('new Vuetify components are registered and survive import', () => {
  const types = [
    'VApp',
    'VMain',
    'VAppBar',
    'VNavigationDrawer',
    'VDataTable',
    'VPagination',
    'VDialog',
    'VMenu',
    'VSnackbar',
    'VTooltip',
    'VDatePicker',
    'VBreadcrumbs',
    'VStepper',
    'VTimeline',
    'VBtnToggle',
    'VSkeletonLoader',
  ]
  for (const type of types) store.addComponent(type, 'root-canvas')
  const project = parseProject(store.exportDocument())
  assert.deepEqual(
    project.pages[0].root.children.map(node => node.type),
    types,
  )
  const table = store.rootNode.children.find(node => node.type === 'VDataTable')
  assert.ok(Array.isArray(table.props.items) && Array.isArray(table.props.headers))
  assert.equal(store.rootNode.children.find(node => node.type === 'VTimeline').children.length, 2)
})

test('MCP page, binding, event and text tools', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule('/src/modules/ui-builder/model/mcpCommands.ts')
  const { id: pageId } = executeMcpCommand(store, 'add_page', { name: 'Orders' })
  executeMcpCommand(store, 'set_route', { id: pageId, path: '/orders-list' })
  assert.deepEqual(
    executeMcpCommand(store, 'list_pages').pages.map(page => page.path),
    ['/', '/orders-list'],
  )
  executeMcpCommand(store, 'select_page', { id: '/' })
  assert.equal(store.activePage.path, '/')
  executeMcpCommand(store, 'set_state', { name: 'query', value: '' })
  const { id: field } = executeMcpCommand(store, 'add_component', { type: 'VTextField' })
  executeMcpCommand(store, 'set_binding', { id: field, model: 'query' })
  const { id: col } = executeMcpCommand(store, 'add_component', {
    type: 'VCol',
    text: 'Hello',
    style: { color: 'red' },
    attrs: { 'aria-label': 'x' },
  })
  assert.equal(store.findNodeById(col).children[0].name, 'Hello')
  assert.deepEqual(store.findNodeById(col).props.style, { color: 'red' })
  executeMcpCommand(store, 'update_node', { id: col, style: { margin: '1px' }, text: 'Bye' })
  assert.deepEqual(store.findNodeById(col).props.style, { color: 'red', margin: '1px' })
  assert.equal(store.findNodeById(col).children[0].name, 'Bye')
  const { id: btn } = executeMcpCommand(store, 'add_component', { type: 'VBtn', text: 'Go' })
  executeMcpCommand(store, 'set_event', { id: btn, click: { type: 'navigate', to: '/orders-list' } })
  assert.equal(executeMcpCommand(store, 'get_node', { id: btn }).events.click.to, '/orders-list')
  executeMcpCommand(store, 'edit_layout', {})
  assert.equal(executeMcpCommand(store, 'get_document').editing, 'layout')
  assert.throws(() => executeMcpCommand(store, 'select_page', { id: 'nope' }), /not found/)
})

test('data table cell slots follow its columns and survive export', () => {
  store.addComponent('VDataTable')
  const id = store.selectedNodeId
  const table = store.findNodeById(id)
  assert.equal(store.appendToSlot(id, 'item.status', store.createNode('VBtn')), true)
  assert.equal(store.appendToSlot(id, 'item.missing', store.createNode('VBtn')), false)
  const reloaded = parseProject(store.exportDocument()).pages[0].root.children[0]
  assert.equal(reloaded.slots['item.status'].length, 1)
  table.props.headers = table.props.headers.filter(header => header.key !== 'status')
  assert.deepEqual(
    parseProject(store.exportDocument()).pages[0].root.children[0].slots,
    {},
    'content of a removed column is dropped on load',
  )
})

test('table columns and rows can be edited by the editor and through MCP', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule('/src/modules/ui-builder/model/mcpCommands.ts')
  const { id } = executeMcpCommand(store, 'add_component', { type: 'VDataTable' })
  const added = executeMcpCommand(store, 'add_table_column', {
    id,
    key: 'total',
    title: 'Total',
    align: 'end',
    width: 120,
  })
  assert.equal(added.columns.at(-1).width, 120)
  assert.throws(() => executeMcpCommand(store, 'add_table_column', { id, key: 'total' }), /already used/)
  executeMcpCommand(store, 'add_table_row', { id, values: { id: 1004, customer: 'Petro', total: 25 } })
  executeMcpCommand(store, 'add_component', { type: 'VBtn', parentId: id, slot: 'item.total', text: 'Pay' })
  // Renaming a key keeps row data and cell content.
  executeMcpCommand(store, 'update_table_column', { id, column: 'total', key: 'amount' })
  const table = executeMcpCommand(store, 'get_table', { id })
  assert.equal(table.rows.at(-1).amount, 25)
  assert.equal('total' in table.rows.at(-1), false)
  assert.equal(table.cellContent.amount.length, 1)
  executeMcpCommand(store, 'update_table_row', { id, index: 0, values: { customer: 'Maria' } })
  assert.equal(executeMcpCommand(store, 'get_table', { id }).rows[0].customer, 'Maria')
  executeMcpCommand(store, 'remove_table_row', { id, index: 0 })
  executeMcpCommand(store, 'remove_table_column', { id, column: 'amount' })
  const after = executeMcpCommand(store, 'get_table', { id })
  assert.equal(
    after.columns.some(column => column.key === 'amount'),
    false,
  )
  assert.deepEqual(store.findNodeById(id).slots, {})
  assert.throws(() => executeMcpCommand(store, 'remove_table_row', { id, index: 99 }), /No row/)
  executeMcpCommand(store, 'update_node', { id, props: { striped: true, headerColor: 'primary', density: 'compact' } })
  assert.equal(executeMcpCommand(store, 'get_table', { id }).settings.striped, true)
  // Tables fed from state refuse manual edits instead of overwriting the binding.
  executeMcpCommand(store, 'update_node', { id, props: { items: '{{orders}}' } })
  assert.throws(() => executeMcpCommand(store, 'add_table_row', { id }), /state/)
  assert.ok(
    executeMcpCommand(store, 'describe_component', { type: 'VDataTable' }).props.some(
      field => field.prop === 'headerColor',
    ),
  )
  store.undo()
})

test('a click can store a whole table row and conditions can read its fields', () => {
  const row = { id: 1002, customer: 'Ivan', step: 1 }
  const action = runtime.bindAction({ type: 'set', key: 'selected', value: '{{item}}' }, { item: row })
  assert.deepEqual(action.value, row)
  assert.notEqual(action.value, row, 'the stored row is a copy')
  const state = { selected: 'none' }
  runtime.runAction(action, { state, navigate() {} })
  assert.equal(state.selected.customer, 'Ivan')
  const text = runtime.bindAction({ type: 'set', key: 'name', value: '{{item.customer}}' }, { item: row })
  assert.equal(text.value, 'Ivan')
})
