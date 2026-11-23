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
