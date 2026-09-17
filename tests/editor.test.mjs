import { test, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'
let server, useStore, parseDocument, serializeDocument, readSpacing, writeSpacing, readFlex, writeFlex, store
const storage = new Map()
before(async () => {
  server = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
  ;({ useUiTreeStore: useStore } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/store.ts'))
  ;({ parseDocument, serializeDocument } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/document.ts'))
  ;({ readSpacing, writeSpacing, readFlex, writeFlex } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/layoutControls.ts'))
  global.window = { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }
})
beforeEach(() => { storage.clear(); setActivePinia(createPinia()); store = useStore() })
afterEach(() => store.$dispose())
after(async () => { delete global.window; await server.close() })

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
  store.addComponent('div'); store.addComponent('VBtn', 'root-canvas'); store.undo()
  store.rootNode.name = 'New page'
  assert.equal(store.canRedo, false)
})
test('save and restore include complete document and slot contents', () => {
  store.addComponent('VCard'); const card = store.selectedNodeId
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
  const doc = parseDocument(saved); doc.name = 'Imported'
  store.importDocument(serializeDocument(doc))
  assert.equal(store.rootNode.name, 'Imported')
  store.undo(); assert.equal(store.exportDocument(), saved)
  assert.throws(() => store.importDocument('{ broken'))
  assert.equal(store.exportDocument(), saved)
  const invalid = parseDocument(saved)
  invalid.children[0].id = 'root-canvas'
  assert.throws(() => store.importDocument(serializeDocument(invalid)), /Invalid component/)
  assert.equal(store.exportDocument(), saved)
})
test('unwrap refuses named slot content without losing data; regular unwrap and undo retain children', () => {
  store.addComponent('VCard'); const id = store.selectedNodeId
  const child = store.createNode('div'); store.appendChild(id, child)
  const title = store.createNode('TEXT', 'Keep me'); store.appendToSlot(id, 'title', title)
  const before = store.exportDocument()
  assert.equal(store.unwrapNode(id), false)
  assert.equal(store.exportDocument(), before)
  store.moveNode(title.id, 'root-canvas')
  assert.equal(store.unwrapNode(id), true)
  assert.ok(store.findNodeById(child.id)); assert.ok(store.findNodeById(title.id))
  store.undo(); assert.ok(store.findNodeById(id))
})
test('prefab selected on a leaf inserts into the nearest container and selects the new copy', () => {
  store.addComponent('VBtn'); const button = store.selectedNodeId
  store.savePrefab(button, 'Action')
  store.addComponent('VIcon', 'root-canvas'); const icon = store.selectedNodeId
  store.insertPrefab(store.prefabs[0].prefabId, icon)
  assert.equal(store.findNodeById(icon).children.length, 0)
  assert.equal(store.rootNode.children.length, 3)
  assert.equal(store.findNodeById(store.selectedNodeId).type, 'VBtn')
  assert.notEqual(store.selectedNodeId, button)
})
test('moves reject cycles and invalid containers, and support named slots', () => {
  store.addComponent('VCard'); const card = store.selectedNodeId
  store.addComponent('div'); const box = store.selectedNodeId
  store.addComponent('VIcon', 'root-canvas'); const icon = store.selectedNodeId
  assert.equal(store.moveNode(card, box), false)
  assert.equal(store.moveNode(box, icon), false)
  assert.equal(store.moveNode(box, card, 'title'), true)
  assert.equal(store.findNodeById(card).slots.title[0].id, box)
})
test('deleting a parent clears selection of its descendants', () => {
  store.addComponent('div'); const parent = store.selectedNodeId
  store.addComponent('VBtn'); const child = store.selectedNodeId
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
  assert.ok(classes.includes('flex-grow-1')); assert.ok(classes.includes('flex-wrap'))
})
test('all starter templates survive validated export and import', () => {
  for (const kind of ['card', 'form', 'columns']) store.addTemplate(kind)
  assert.equal(parseDocument(store.exportDocument()).children.length, 3)
})
