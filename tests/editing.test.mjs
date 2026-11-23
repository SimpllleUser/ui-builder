import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseProject,
  readSpacing,
  writeSpacing,
  readFlex,
  writeFlex,
  groupNodes,
  ungroupNode,
  clonePaletteItem,
  parseMoveDestination,
  canSavePrefabName,
  jsonTree,
  fieldTabs,
  server,
  store,
} from './support.mjs'

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

test('a page has one name: the root follows the page, and similar elements are numbered', () => {
  const id = store.activePage.id
  assert.equal(store.nodeLabel(store.rootNode), store.activePage.name)
  store.renameNode('root-canvas', 'Dashboard')
  assert.equal(store.activePage.name, 'Dashboard')
  assert.equal(store.rootNode.name, 'Dashboard')
  store.updateNodeName('root-canvas', 'Dash')
  assert.equal(store.activePage.name, 'Dash')
  assert.equal(store.updateNodeName('root-canvas', '  '), false, 'a page cannot lose its name')
  store.updatePage(id, { name: 'Overview' })
  assert.equal(store.nodeLabel(store.rootNode), 'Overview')
  // Old documents had a different root name than the page.
  const legacy = parseProject(JSON.stringify({ version: 1, root: { ...store.rootNode, name: 'Untitled page' } }))
  assert.equal(legacy.pages[0].root.name, legacy.pages[0].name)

  store.addComponent('VDataTable')
  store.addComponent('VDataTable')
  store.addComponent('VDataTable')
  assert.deepEqual(
    store.rootNode.children.map(node => node.name),
    ['Data table', 'Data table 2', 'Data table 3'],
  )
  store.addComponent('VBtn', 'root-canvas')
  store.addComponent('VBtn', 'root-canvas')
  assert.deepEqual(
    store.rootNode.children.slice(3).map(node => node.name),
    ['Button', 'Button 2'],
  )
})

test('saved component parameters are filled in on insert, with defaults for missing values', () => {
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.updateNodeProp(button, 'text', 'Hello {{props.who}}')
  store.updateNodeProp(button, 'color', '{{ props.tone }}')
  store.savePrefab(button, 'Greeting', { tone: 'primary' })
  const [prefab] = store.prefabs
  assert.deepEqual(prefab.props, [
    { name: 'who', defaultValue: '' },
    { name: 'tone', defaultValue: 'primary' },
  ])
  assert.equal(store.findNodeById(button).props.text, 'Hello {{props.who}}', 'the template itself stays unchanged')

  store.insertPrefab(prefab.prefabId, 'root-canvas', null, { who: 'Ann' })
  const inserted = store.findNodeById(store.selectedNodeId)
  assert.equal(inserted.props.text, 'Hello Ann')
  assert.equal(inserted.props.color, 'primary')
})

test('saved component parameters also work in text, conditions and click actions', () => {
  const { addComponent, updateNodeName } = store
  addComponent('VBtn')
  const button = store.selectedNodeId
  store.updateNodeLogic(button, {
    vIf: 'page == {{props.page}}',
    events: { click: { type: 'navigate', to: '/{{props.page}}' } },
  })
  const label = store.findNodeById(button).children[0]
  updateNodeName(label.id, 'Open {{props.page}}')
  store.savePrefab(button, 'Link', { page: 'home' })
  store.insertPrefab(store.prefabs[0].prefabId, 'root-canvas', null, { page: 'engines' })
  const inserted = store.findNodeById(store.selectedNodeId)
  assert.equal(inserted.vIf, 'page == engines')
  assert.equal(inserted.events.click.to, '/engines')
  assert.equal(inserted.children[0].name, 'Open engines')
})

test('a saved component can be edited in place of the page, and its parameters follow the edits', () => {
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.savePrefab(button, 'Action')
  const [{ prefabId }] = store.prefabs
  const pageRoot = store.rootNode

  assert.equal(store.editPrefab('nope'), false)
  assert.equal(store.editPrefab(prefabId), true)
  assert.equal(store.rootNode, store.editingPrefab.node)
  assert.deepEqual(store.selectedNodeIds, [store.rootNode.id], 'its settings open in the properties panel')
  assert.equal(store.canUndo, false, 'history only covers the project')

  store.updateNodeProp(store.rootNode.id, 'color', '{{props.tone}}')
  assert.deepEqual(store.prefabs[0].props, [{ name: 'tone', defaultValue: '' }])
  assert.equal(pageRoot.children[0].props.color, undefined, 'the page is not changed')

  store.stopEditingPrefab()
  assert.equal(store.rootNode, pageRoot)
  store.editPrefab(prefabId)
  store.selectPage(store.pages[0].id)
  assert.equal(store.editingPrefab, null, 'opening a page leaves the component')
})

test('preview of an edited component shows that component with its default parameters', () => {
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.updateNodeProp(button, 'text', 'Hello {{props.who}}')
  store.savePrefab(button, 'Greeting', { who: 'Ann' })
  store.editPrefab(store.prefabs[0].prefabId)
  store.startPreview()
  assert.equal(store.previewRoot.props.text, 'Hello Ann')
  assert.equal(store.previewRoot.id, button)
  assert.equal(store.rootNode.props.text, 'Hello {{props.who}}', 'the template itself is unchanged')
  store.stopEditingPrefab()
  assert.equal(store.previewRoot, store.activePage.root, 'back to the page')
})

test('previewing a component and switching to another one shows only the chosen component', () => {
  store.addComponent('VBtn')
  store.savePrefab(store.selectedNodeId, 'First')
  store.addComponent('VIcon', 'root-canvas')
  store.savePrefab(store.selectedNodeId, 'Second')
  const [first, second] = store.prefabs
  store.editPrefab(first.prefabId)
  store.startPreview()
  assert.equal(store.previewRoot.id, first.node.id)
  store.editPrefab(second.prefabId)
  assert.equal(store.previewRoot.id, second.node.id, 'preview follows the chosen component')
  assert.equal(store.isPreviewMode, true)
})

test('Preview of a page hides the panels, while Preview of a component keeps them and only changes the mode', async () => {
  const { useFocusMode } = await server.ssrLoadModule('/src/app/shell/useFocusMode.ts')
  const { showChrome } = useFocusMode(store, 'Ctrl')
  assert.equal(showChrome.value, true)
  store.startPreview()
  assert.equal(showChrome.value, false, 'a page is previewed on its own')
  store.isPreviewMode = false

  store.addComponent('VBtn')
  store.savePrefab(store.selectedNodeId, 'Action')
  store.editPrefab(store.prefabs[0].prefabId)
  store.startPreview()
  assert.equal(showChrome.value, true, 'a component is previewed on the canvas')
})

test('json tree helpers change, remove and add values without touching the original', () => {
  const { JsonKind, jsonKind, setAtPath, removeAtPath, addChildAtPath, jsonKeyError, emptyJsonValue, jsonEntries } =
    jsonTree
  const original = { color: 'info', style: { padding: 4 }, items: ['a', 'b', 'c'] }
  const snapshot = JSON.stringify(original)

  assert.deepEqual(setAtPath(original, ['style', 'padding'], 8).style, { padding: 8 })
  assert.deepEqual(setAtPath(original, ['items', '1'], 'x').items, ['a', 'x', 'c'])
  assert.deepEqual(removeAtPath(original, ['items', '0']).items, ['b', 'c'])
  assert.equal('color' in removeAtPath(original, ['color']), false)
  assert.deepEqual(addChildAtPath(original, ['items'], '', 'd').items, ['a', 'b', 'c', 'd'])
  assert.deepEqual(addChildAtPath(original, ['style'], 'margin', 2).style, { padding: 4, margin: 2 })
  assert.equal(JSON.stringify(original), snapshot, 'the original is never changed')

  assert.equal(jsonKeyError(original, 'color'), '“color” already exists.')
  assert.equal(jsonKeyError(original, ' '), 'Write a name.')
  assert.equal(jsonKeyError(original, 'size'), null)
  assert.equal(jsonKeyError(original.items, ''), null, 'arrays need no key')

  assert.equal(jsonKind(null), JsonKind.Null)
  assert.equal(jsonKind([]), JsonKind.Array)
  assert.equal(jsonKind(2), JsonKind.Number)
  assert.deepEqual(emptyJsonValue(JsonKind.Object), {})
  assert.deepEqual(jsonEntries(['a']), [{ key: '0', value: 'a' }])
})

test('a text element has no JSON or Design tab, since its text lives in its name', () => {
  const { inspectorTabsFor, InspectorTab } = fieldTabs
  const ids = tabs => tabs.map(tab => tab.id)
  store.addComponent('VBtn')
  const button = store.findNodeById(store.selectedNodeId)
  const text = store.createNode('TEXT', 'Hello')
  assert.ok(ids(inspectorTabsFor(button, true)).includes(InspectorTab.Json))
  assert.ok(ids(inspectorTabsFor(button, true)).includes(InspectorTab.Design))
  assert.equal(ids(inspectorTabsFor(button, false)).includes(InspectorTab.Design), false, 'the Design tab can be off')
  assert.deepEqual(
    ids(inspectorTabsFor(text, true)).filter(id => [InspectorTab.Json, InspectorTab.Design].includes(id)),
    [],
  )
})
