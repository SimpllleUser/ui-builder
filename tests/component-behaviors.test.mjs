import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codegen, server, store } from './support.mjs'

const load = () => server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/componentBehaviors.ts')
const TABLE_LOOKS = { striped: true, bordered: true, headerColor: 'primary' }

/** Adds a component with the given props and returns the code its page is exported as. */
function exportedWith(type, props) {
  store.addComponent(type)
  const id = store.selectedNodeId
  for (const [prop, value] of Object.entries(props)) store.updateNodeProp(id, prop, value)
  return codegen.exportPage(store.pages[0], store.project.state, 'Page.vue').code
}

test('Preview and export hand a component the same props', async () => {
  const { componentProps } = await load()
  const given = componentProps('VBadge', { ...TABLE_LOOKS, mask: '##', class: 'a', style: 'b' })
  assert.deepEqual(given, TABLE_LOOKS)
  const code = exportedWith('VBadge', TABLE_LOOKS)
  assert.match(code, /<VBadge[^>]*\bbordered\b/s)
  assert.match(code, /<VBadge[^>]*\bstriped\b/s)
  assert.match(code, /headerColor="primary"/)
})

test('a data table turns its looks into classes and its height into a number', async () => {
  const { componentProps, behaviorOf } = await load()
  assert.deepEqual(componentProps('VDataTable', { ...TABLE_LOOKS, height: '300' }), { height: 300 })
  assert.deepEqual(behaviorOf('VDataTable').editorClasses(TABLE_LOOKS), [
    'ui-table--striped',
    'ui-table--bordered',
    'ui-table-header--primary',
  ])
  const code = exportedWith('VDataTable', { ...TABLE_LOOKS, height: '300' })
  assert.match(code, /:height="300"/)
  assert.match(code, /ui-table--bordered/)
  assert.doesNotMatch(code, /\sbordered(\s|=|\/|>)/)
})

test('only table cell slots receive the row', async () => {
  const { behaviorOf } = await load()
  assert.deepEqual(behaviorOf('VDataTable').slotParams('item.name'), ['item', 'value', 'index'])
  assert.deepEqual(behaviorOf('VDataTable').slotParams('bottom'), [])
  assert.equal(behaviorOf('VCard').slotParams, undefined)
})

test('a type that is not registered behaves as a plain component', async () => {
  const { behaviorOf, clickEventOf } = await load()
  assert.deepEqual(behaviorOf('constructor'), {})
  assert.equal(clickEventOf('VBtn'), 'click')
  assert.equal(clickEventOf('VDataTable'), 'click:row')
})
