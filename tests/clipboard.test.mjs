import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryProject, parseProject, store } from './support.mjs'

const childIds = id => store.findNodeById(id).children.map(node => node.id)

test('a copied element is pasted next to itself with new ids, a free name and its own undo step', () => {
  store.addComponent('VCard')
  const card = store.selectedNodeId
  store.addComponent('VBtn', card)
  store.selectNode(card)
  const text = store.copySelection()
  assert.equal(store.pasteElements(text), true)
  const [first, second] = store.rootNode.children
  assert.equal(first.id, card)
  assert.notEqual(second.id, card)
  assert.notEqual(second.children[0].id, first.children[0].id)
  assert.notEqual(second.name, first.name)
  assert.equal(store.selectedNodeId, second.id)
  store.undo()
  assert.equal(store.rootNode.children.length, 1)
})

test('pasting goes inside a selected container, next to a leaf, and to the page without a selection', () => {
  store.addComponent('VBtn')
  const text = store.copySelection()
  store.addComponent('div', 'root-canvas')
  const box = store.selectedNodeId
  store.pasteElements(text)
  assert.equal(childIds(box).length, 1)
  store.addComponent('VIcon', 'root-canvas')
  const icon = store.selectedNodeId
  store.pasteElements(text)
  const order = childIds('root-canvas')
  assert.equal(order.indexOf(store.selectedNodeId), order.indexOf(icon) + 1)
  store.selectNode(null)
  store.pasteElements(text)
  assert.equal(childIds('root-canvas').at(-1), store.selectedNodeId)
})

test('several elements keep their order; the page root and elements inside a picked one are left out', () => {
  store.addComponent('VCard')
  const card = store.selectedNodeId
  store.addComponent('VBtn', card)
  const inner = store.selectedNodeId
  store.addComponent('VIcon', 'root-canvas')
  const icon = store.selectedNodeId
  store.selectedNodeIds = [icon, inner, card, 'root-canvas']
  const copied = JSON.parse(store.copySelection())
  assert.deepEqual(
    copied.nodes.map(node => node.id),
    [card, icon],
  )
  store.selectNode('root-canvas')
  assert.equal(store.copySelection(), null)
})

test('elements travel to another project together with the variables they use', () => {
  store.addComponent('VTextField')
  store.setStateVariable('query', 'shoes')
  store.setStateVariable('unrelated', 1)
  store.updateNodeLogic(store.selectedNodeId, { model: 'query' })
  const text = store.copySelection()
  const empty = { version: 2, pages: [], layout: null, state: {} }
  store.addPage('Spare')
  empty.pages = [JSON.parse(store.exportDocument()).pages.at(-1)]
  store.openProject(memoryProject(JSON.stringify(empty)).opened())
  assert.equal(store.pasteElements(text), true)
  assert.deepEqual(store.project.state, { query: 'shoes' })
  assert.doesNotThrow(() => parseProject(store.exportDocument()))
})

test('other clipboard text is ignored and damaged elements change nothing', () => {
  const before = store.exportDocument()
  assert.equal(store.pasteElements('hello'), false)
  assert.equal(store.pasteElements('{"a":1}'), false)
  const damaged = JSON.stringify({ kind: 'ui-builder/elements', nodes: [{ id: 'x', type: 'Unknown' }] })
  assert.equal(store.pasteElements(damaged), false)
  assert.equal(store.exportDocument(), before)
})
