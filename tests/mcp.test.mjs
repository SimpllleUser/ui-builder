import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, store } from './support.mjs'

test('MCP commands edit the page through the store', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
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

test('MCP page, binding, event and text tools', async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
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
  assert.deepEqual(store.findNodeById(col).props.style, { color: 'red !important' })
  executeMcpCommand(store, 'update_node', { id: col, style: { margin: '1px' }, text: 'Bye' })
  assert.deepEqual(store.findNodeById(col).props.style, { color: 'red !important', margin: '1px !important' })
  assert.equal(store.findNodeById(col).children[0].name, 'Bye')
  const { id: btn } = executeMcpCommand(store, 'add_component', { type: 'VBtn', text: 'Go' })
  executeMcpCommand(store, 'set_event', { id: btn, click: { type: 'navigate', to: '/orders-list' } })
  assert.equal(executeMcpCommand(store, 'get_node', { id: btn }).events.click.to, '/orders-list')
  executeMcpCommand(store, 'edit_layout', {})
  assert.equal(executeMcpCommand(store, 'get_document').editing, 'layout')
  assert.throws(() => executeMcpCommand(store, 'select_page', { id: 'nope' }), /not found/)
})
