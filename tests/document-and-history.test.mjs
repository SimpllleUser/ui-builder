import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia } from 'pinia'
import {
  server,
  useStore,
  parseProject,
  serializeProject,
  parseDocument,
  serializeDocument,
  store,
} from './support.mjs'

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
  doc.props.color = 'primary'
  store.importDocument(serializeDocument(doc))
  assert.equal(store.rootNode.props.color, 'primary')
  store.undo()
  assert.equal(store.exportDocument(), saved)
  assert.throws(() => store.importDocument('{ broken'))
  assert.equal(store.exportDocument(), saved)
  const invalid = parseDocument(saved)
  invalid.children[0].id = 'root-canvas'
  assert.throws(() => store.importDocument(serializeDocument(invalid)), /Invalid component/)
  assert.equal(store.exportDocument(), saved)
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

test('history versions are named after what changed', async () => {
  const { describeChange } = await server.ssrLoadModule(
    '/src/modules/ui-builder/entities/ui-node/model/historyLabels.ts',
  )
  const labelsNow = () => store.historyVersions.map(version => version.label)
  assert.deepEqual(labelsNow(), ['Opened'])

  store.addComponent('VDataTable', 'root-canvas')
  const id = store.selectedNodeId
  store.addComponent('VBtn', 'root-canvas')
  const button = store.selectedNodeId
  store.table.addColumn(id, { key: 'total', title: 'Total' })
  store.table.addRow(id, { id: 5 })
  store.table.removeRow(id, 0)
  store.table.removeColumn(id, 'total')
  store.commit()
  store.updateNodeProp(id, 'striped', true)
  store.commit()
  store.updateNodeClasses(button, ['ma-2'])
  store.commit()
  store.renameNode(button, 'Pay button')
  store.updateNodeLogic(button, { vIf: 'open' })
  store.updateNodeLogic(button, { vIf: '' })
  store.reorderNode(button, -1)
  store.setStateVariable('open', false)
  store.removeStateVariable('open')
  const second = store.addPage('Orders')
  store.updatePage(second.id, { name: 'Sales' })
  store.deletePage(second.id)
  store.deleteNode(button)

  assert.deepEqual(labelsNow(), [
    'Opened',
    'Added Data table',
    'Added Button',
    'Added a column to Data table',
    'Added a row to Data table',
    'Removed a row from Data table',
    'Removed a column from Data table',
    'Changed Data table: striped',
    'Changed the style of Button',
    'Renamed Button to Pay button',
    'Changed the behavior of Pay button',
    'Removed the behavior of Pay button',
    'Reordered Pay button',
    'Added variable open',
    'Removed variable open',
    'Added page “Orders”',
    'Renamed page “Orders” to “Sales”',
    'Deleted page “Sales”',
    'Deleted Pay button',
  ])

  // Plain differences, without the store.
  const snapshot = project => JSON.stringify(project)
  const text = JSON.parse(store.exportDocument())
  const edited = structuredClone(text)
  assert.equal(describeChange(snapshot(text), snapshot(edited)), 'Edited the page', 'no visible difference')
  assert.equal(describeChange('not json', '{}'), 'Edited the page', 'unreadable snapshots do not break')
})

test('deleting anything offers Undo, and Undo brings it back', () => {
  store.addComponent('VBtn', 'root-canvas')
  const id = store.selectedNodeId
  store.addComponent('VCard', 'root-canvas')
  assert.equal(store.noticeUndo, false, 'adding does not offer undo')

  const serial = store.noticeSerial
  store.deleteNode(id)
  assert.equal(store.notice, 'Deleted Button.')
  assert.equal(store.noticeUndo, true)
  assert.ok(store.noticeSerial > serial)
  store.undo()
  assert.ok(store.findNodeById(id), 'Undo restored the element')

  // The same message shows again after a second deletion.
  const again = store.noticeSerial
  store.deleteNode(id)
  assert.ok(store.noticeSerial > again)
  store.undo()

  // Other removals are covered the same way, and ordinary messages carry no Undo.
  store.setStateVariable('x', 1)
  store.removeStateVariable('x')
  assert.equal(store.notice, 'Removed variable x.')
  assert.equal(store.noticeUndo, true)
  store.setNotice('Hello')
  assert.equal(store.noticeUndo, false)
})

test('removing or adding the text of an element is not mistaken for the element', async () => {
  store.addComponent('VBtn', 'root-canvas')
  const button = store.findNodeById(store.selectedNodeId)
  const text = button.children[0]
  store.deleteNode(text.id)
  assert.equal(store.notice, `Deleted the text of ${button.name}.`)
  assert.ok(store.findNodeById(button.id), 'the button itself is still there')
  store.undo()
  assert.equal(store.findNodeById(text.id).type, 'TEXT')
})
