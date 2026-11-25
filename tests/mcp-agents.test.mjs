import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, store } from './support.mjs'

const load = () => server.ssrLoadModule('/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts')

test('set_style writes values that beat utility classes and understands theme colours', async () => {
  const { executeMcpCommand: run } = await load()
  const { id } = run(store, 'add_component', { type: 'VCard', classes: ['pa-4'] })
  const answer = run(store, 'set_style', {
    id,
    style: { padding: 24, 'border-radius': 12, opacity: 0.5, backgroundColor: 'primary' },
  })
  const raw = store.findNodeById(id).props.style
  assert.equal(raw.padding, '24px !important')
  assert.equal(raw.borderRadius, '12px !important')
  assert.equal(raw.opacity, '0.5 !important')
  assert.match(raw.backgroundColor, /rgb\(var\(--v-theme-primary\)\)/)
  assert.equal(answer.style.padding, '24px')
  run(store, 'set_style', { id, style: { padding: null } })
  assert.equal('padding' in store.findNodeById(id).props.style, false)
  assert.throws(() => run(store, 'set_style', { id, style: { color: 'red; x: y' } }), /not allowed/)
})

test('set_style styles one Vuetify breakpoint without touching the others', async () => {
  const { executeMcpCommand: run } = await load()
  const { id } = run(store, 'add_component', { type: 'div' })
  run(store, 'set_style', { id, style: { width: 100 } })
  const answer = run(store, 'set_style', { id, style: { width: 300, color: 'red' }, breakpoint: 'md' })
  assert.deepEqual(answer.style, { width: '100px' })
  assert.deepEqual(answer.responsive, { md: { width: '300px', color: 'red' } })
  assert.equal(run(store, 'get_node', { id }).responsive.md.width, '300px !important')
  run(store, 'set_style', { id, style: { color: null }, breakpoint: 'md' })
  assert.deepEqual(Object.keys(store.findNodeById(id).responsive.md), ['width'])
  run(store, 'set_style', { id, style: { height: 5 }, breakpoint: 'xs' })
  assert.equal(store.findNodeById(id).props.style.height, '5px !important')
  assert.throws(() => run(store, 'set_style', { id, style: { width: 1 }, breakpoint: 'xxl' }), /Unknown breakpoint/)
})

test('a null style clears the named breakpoint, or every style when none is named', async () => {
  const { executeMcpCommand: run } = await load()
  const { id } = run(store, 'add_component', { type: 'div' })
  const style = () => store.findNodeById(id)
  const fill = () => {
    run(store, 'set_style', { id, style: { width: 1 } })
    run(store, 'set_style', { id, style: { width: 2 }, breakpoint: 'sm' })
  }
  fill()
  run(store, 'set_style', { id, style: null, breakpoint: 'sm' })
  assert.equal(style().responsive, undefined)
  assert.ok(style().props.style)
  fill()
  run(store, 'set_style', { id, style: null, breakpoint: 'xs' })
  assert.equal(style().props.style, undefined)
  assert.ok(style().responsive.sm)
  fill()
  run(store, 'set_style', { id, style: null })
  assert.equal(style().props.style, undefined)
  assert.equal(style().responsive, undefined)
})

test('add_subtree builds a tree in one undo step and rejects a bad tree whole', async () => {
  const { executeMcpCommand: run } = await load()
  const before = JSON.stringify(store.project)
  const { id, refs } = run(store, 'add_subtree', {
    tree: {
      type: 'VCard',
      ref: 'card',
      classes: ['pa-4'],
      style: { gap: 8 },
      children: [
        { type: 'VCardTitle', text: 'Hello {{ name }}', ref: 'title' },
        { type: 'VBtn', text: 'Go', ref: 'go', click: { type: 'set', key: 'name', value: 'Ann' } },
      ],
    },
  })
  assert.equal(refs.card, id)
  assert.equal(store.findNodeById(refs.go).events.click.key, 'name')
  assert.equal(store.findNodeById(refs.title).children[0].name, 'Hello {{ name }}')
  store.undo()
  assert.equal(JSON.stringify(store.project), before)
  assert.throws(
    () => run(store, 'add_subtree', { tree: { type: 'VCard', children: [{ type: 'Nope' }] } }),
    /unknown component/,
  )
  assert.equal(JSON.stringify(store.project), before)
})

test('batch is one undo step, passes results between steps and rolls back on failure', async () => {
  const { executeMcpCommand: run } = await load()
  const before = JSON.stringify(store.project)
  run(store, 'batch', {
    steps: [
      { tool: 'add_component', args: { type: 'VCard' } },
      { tool: 'add_component', args: { type: 'VBtn', parentId: '$0.id', text: 'A' } },
      { tool: 'set_state', args: { name: 'count', value: 1 } },
    ],
  })
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.rootNode.children[0].children.length, 1)
  store.undo()
  assert.equal(JSON.stringify(store.project), before)

  assert.throws(
    () =>
      run(store, 'batch', {
        steps: [
          { tool: 'add_component', args: { type: 'VCard' } },
          { tool: 'delete_node', args: { id: 'missing' } },
        ],
      }),
    /Step 1 \(delete_node\) failed/,
  )
  assert.equal(JSON.stringify(store.project), before)
  assert.throws(() => run(store, 'batch', { steps: [{ tool: 'undo' }] }), /cannot be used/)
})

test('check_project reports what would break', async () => {
  const { executeMcpCommand: run } = await load()
  run(store, 'add_subtree', {
    tree: {
      type: 'div',
      children: [
        { type: 'VCardTitle', text: 'Hi {{ ghost }}' },
        { type: 'VBtn', text: 'Go', click: { type: 'navigate', to: '/nowhere' } },
        { type: 'VTextField', model: 'email' },
        { type: 'div', vIf: 'a ??? b' },
      ],
    },
  })
  run(store, 'set_state', { name: 'unused', value: 1 })
  const { issues, ok } = run(store, 'check_project')
  const kinds = issues.map(issue => issue.kind)
  assert.equal(ok, false)
  for (const kind of ['unknown-variable', 'missing-route', 'invalid-condition', 'unused-variable'])
    assert.ok(kinds.includes(kind), kind)
  assert.ok(issues.find(issue => issue.kind === 'missing-route').nodeId)
})

test('check_project reads variables inside compound conditions, not operators or function names', async () => {
  const { executeMcpCommand: run } = await load()
  for (const name of ['plan', 'email']) run(store, 'set_state', { name, value: '' })
  run(store, 'add_subtree', {
    tree: {
      type: 'div',
      children: [
        { type: 'VBtn', text: 'Ok', vIf: 'not empty(plan) and contains(email, "@") or status == paid' },
        { type: 'VBtn', text: 'Bad', vIf: 'missing > 1 and plan' },
      ],
    },
  })
  const messages = run(store, 'check_project').issues.map(issue => issue.message)
  assert.equal(messages.filter(message => /“(not|empty|contains|paid)”/.test(message)).length, 0)
  assert.equal(messages.filter(message => message.includes('“missing”')).length, 1)
})

test('preview tools run the page and report what is shown', async () => {
  const { executeMcpCommand: run } = await load()
  run(store, 'set_state', { name: 'open', value: false })
  run(store, 'set_state', { name: 'name', value: 'Ann' })
  const { refs } = run(store, 'add_subtree', {
    tree: {
      type: 'div',
      children: [
        { type: 'VBtn', text: 'Open', ref: 'btn', click: { type: 'toggle', key: 'open' } },
        { type: 'VCardText', text: 'Secret', vIf: 'open' },
        { type: 'VTextField', ref: 'input', model: 'name' },
        { type: 'VCardTitle', text: 'Hi {{ name }}' },
      ],
    },
  })
  let view = run(store, 'preview_start')
  assert.equal(view.variables.open, false)
  assert.ok(view.hidden.some(item => item.condition === 'open'))
  assert.ok(view.texts.includes('Hi Ann'))
  view = run(store, 'preview_click', { id: refs.btn })
  assert.equal(view.variables.open, true)
  assert.ok(view.texts.includes('Secret'))
  view = run(store, 'preview_input', { id: refs.input, value: 'Bob' })
  assert.ok(view.texts.includes('Hi Bob'))
  view = run(store, 'preview_reset')
  assert.equal(view.variables.open, false)
  assert.equal(JSON.stringify(store.project.state), JSON.stringify({ open: false, name: 'Ann' }))
  run(store, 'preview_stop')
  assert.throws(() => run(store, 'preview_state'), /not running/)
})

test('history, checkpoints, saved components and wrapping are available to agents', async () => {
  const { executeMcpCommand: run } = await load()
  const { id } = run(store, 'add_component', { type: 'VCard' })
  const { checkpointId } = run(store, 'create_checkpoint', { name: 'before' })
  run(store, 'add_component', { type: 'VBtn' })
  const history = run(store, 'get_history')
  assert.equal(history.checkpoints[0].name, 'before')
  assert.ok(history.versions.length >= 2)
  run(store, 'restore_checkpoint', { checkpointId })
  assert.equal(store.rootNode.children.length, 1)
  assert.throws(() => run(store, 'restore_checkpoint', { checkpointId: 'nope' }), /No checkpoint/)
  assert.throws(() => run(store, 'restore_version', { index: 999 }), /No history version/)

  const { prefabId } = run(store, 'save_component', { id, name: 'My card' })
  assert.equal(run(store, 'list_saved_components')[0].name, 'My card')
  run(store, 'insert_saved_component', { prefabId })
  assert.equal(store.rootNode.children.length, 2)
  run(store, 'delete_saved_component', { prefabId })
  assert.equal(run(store, 'list_saved_components').length, 0)

  const { id: wrapper } = run(store, 'wrap_nodes', {
    ids: store.rootNode.children.map(node => node.id),
    type: 'VContainer',
  })
  assert.equal(store.rootNode.children.length, 1)
  assert.equal(store.findNodeById(wrapper).children.length, 2)
  assert.throws(() => run(store, 'wrap_nodes', { ids: [wrapper], type: 'VBtn' }), /Wrap with one of/)
  run(store, 'unwrap_node', { id: wrapper })
  assert.equal(store.rootNode.children.length, 2)

  const status = run(store, 'get_status')
  assert.equal(status.connected, true)
  assert.equal(status.previewing, false)
})
