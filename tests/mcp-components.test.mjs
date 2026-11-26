import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { server, store } from './support.mjs'

const load = () => server.ssrLoadModule('/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts')

/** A saved button with one instance of it on the page. */
async function setUp() {
  const { executeMcpCommand } = await load()
  const run = (command, args) => executeMcpCommand(store, command, args)
  const { id } = run('add_component', { type: 'VBtn', text: 'Buy' })
  const { prefabId } = run('save_component', { id, name: 'Buy button' })
  run('delete_node', { id })
  run('insert_saved_component', { prefabId })
  return { run, prefabId, instanceId: store.selectedNodeId }
}

test('an agent edits the original of a component, and the instances follow', async () => {
  const { run, prefabId, instanceId } = await setUp()
  const opened = await run('edit_saved_component', { prefabId })
  assert.deepEqual(opened.editing, { component: prefabId, name: 'Buy button' })
  assert.deepEqual(run('get_status').editing, opened.editing)
  assert.deepEqual(run('get_document').editing, opened.editing)
  assert.throws(() => run('add_template', { kind: 'card' }), /close_saved_component/)

  run('update_node', { id: opened.root.id, props: { color: 'error' } })
  assert.deepEqual(run('close_saved_component').editing, store.activePage.id)
  assert.equal(run('get_node', { id: instanceId }).props.color, 'error')
  assert.deepEqual(Object.keys(run('get_node', { id: instanceId }).instance), ['prefabId', 'values'])
  await assert.rejects(run('edit_saved_component', { prefabId: 'nope' }), /No saved component/)
})

test('an agent lists and restores deleted components', async () => {
  const { run, prefabId } = await setUp()
  run('delete_saved_component', { prefabId })
  assert.deepEqual(
    run('list_deleted_components').map(item => item.name),
    ['Buy button'],
  )
  run('restore_saved_component', { prefabId })
  assert.equal(run('list_saved_components').length, 1)
  assert.deepEqual(run('list_deleted_components'), [])
  assert.throws(() => run('restore_saved_component', { prefabId }), /No deleted component/)
})

test('adding into an instance is refused with the reason', async () => {
  const { run, prefabId, instanceId } = await setUp()
  const { id: other } = run('add_component', { type: 'VBtn', parentId: 'root-canvas' })
  const inner = store.findNodeById(instanceId).children[0].id
  for (const [command, args] of [
    ['add_component', { type: 'VBtn', parentId: instanceId }],
    ['add_subtree', { parentId: instanceId, tree: { type: 'VBtn' } }],
    ['move_node', { id: other, parentId: instanceId }],
    ['insert_saved_component', { prefabId, parentId: instanceId }],
    ['wrap_nodes', { ids: [inner], type: 'div' }],
  ])
    assert.throws(() => run(command, args), /component instance/, command)
  assert.throws(
    () => run('batch', { steps: [{ tool: 'edit_saved_component', args: { prefabId } }] }),
    /cannot be used in a batch/,
  )
})

test('every tool of the MCP server has a command in the editor', async () => {
  const { MCP_COMMANDS } = await load()
  const source = readFileSync(new URL('../mcp/server.mjs', import.meta.url), 'utf8')
  const projects = readFileSync(
    new URL('../src/modules/ui-builder/features/mcp-bridge/model/mcpProjectCommands.ts', import.meta.url),
    'utf8',
  )
  const tools = [...source.matchAll(/\btool\(\s*'(\w+)'/g)].map(match => match[1])
  const missing = tools.filter(name => !(name in MCP_COMMANDS) && !projects.includes(name))
  assert.deepEqual(missing, [])
  assert.ok(tools.includes('restore_saved_component'))
})

test('an agent gives parameters types, and the check finds instances they no longer accept', async () => {
  const { executeMcpCommand } = await load()
  const run = (command, args) => executeMcpCommand(store, command, args)
  const { id } = run('add_component', { type: 'VBtn', text: '{{props.count}}' })
  assert.throws(
    () => run('save_component', { id, name: 'Counter', parameters: [{ name: 'count', type: 'date' }] }),
    /type is one of/,
  )
  assert.throws(
    () =>
      run('save_component', {
        id,
        name: 'Counter',
        props: { count: 'x' },
        parameters: [{ name: 'count', type: 'number' }],
      }),
    /count: Enter a number/,
  )
  const { prefabId } = run('save_component', { id, name: 'Counter' })
  run('delete_node', { id })
  run('insert_saved_component', { prefabId, props: { count: 'many' } })
  const instanceId = store.selectedNodeId
  const invalid = () => run('check_project').issues.filter(issue => issue.kind === 'invalid-parameter')
  assert.deepEqual(invalid(), [])

  run('set_parameter', { prefabId, parameter: { name: 'count', type: 'number', max: 9 } })
  assert.equal(invalid()[0].nodeId, instanceId)
  assert.match(invalid()[0].message, /“count” \(“many”\): Enter a number/)
  assert.throws(() => run('update_instance', { id: instanceId, props: { count: '10' } }), /9 or less/)
  run('update_instance', { id: instanceId, props: { count: '3' } })
  assert.deepEqual(invalid(), [])

  assert.throws(() => run('set_parameter', { prefabId, parameter: { name: 'ref' } }), /reserves/)
  run('set_parameter', { prefabId, parameter: { name: 'tone', type: 'choice', options: ['a'] } })
  assert.equal(run('remove_parameter', { prefabId, name: 'tone' }).stillUsed, false)
  assert.equal(run('remove_parameter', { prefabId, name: 'count' }).stillUsed, true)
  assert.throws(() => run('remove_parameter', { prefabId, name: 'tone' }), /has no parameter/)
})
