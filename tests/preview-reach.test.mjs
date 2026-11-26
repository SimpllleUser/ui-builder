import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server, store } from './support.mjs'

const runner = async () => {
  const { executeMcpCommand } = await server.ssrLoadModule(
    '/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts',
  )
  return (command, args) => executeMcpCommand(store, command, args)
}

test('preview input and submit work on the page Preview shows, not the one open in the editor', async () => {
  const run = await runner()
  const home = store.activePage.id
  run('add_page', { name: 'Join', path: '/join' })
  run('set_state', { name: 'name', value: '' })
  const { id, refs } = run('add_subtree', {
    tree: { type: 'VForm', children: [{ type: 'VTextField', ref: 'field', model: 'name' }] },
  })
  run('select_page', { id: home })

  run('preview_start')
  run('preview_navigate', { path: '/join' })
  run('preview_input', { id: refs.field, value: 'Anna' })
  assert.equal(store.runtimeState.name, 'Anna')
  assert.equal(run('preview_submit', { id }).submitted, true)
})

test('an element a person could not use is refused with the reason', async () => {
  const run = await runner()
  run('set_state', { name: 'open', value: false })
  run('set_state', { name: 'items', value: ['a'] })
  const click = { type: 'set', key: 'open', value: 'true' }
  const { refs } = run('add_subtree', {
    tree: {
      type: 'div',
      children: [
        { type: 'div', vIf: 'open', children: [{ type: 'VBtn', ref: 'inside', text: 'Inside', click }] },
        { type: 'VBtn', ref: 'off', text: 'Off', props: { disabled: true }, click },
        { type: 'VBtn', ref: 'repeated', text: 'Item', vFor: 'items', vIf: 'item == a', click },
      ],
    },
  })
  run('preview_start')
  assert.throws(() => run('preview_click', { id: refs.inside }), /hidden \(inside .*condition open/)
  assert.throws(() => run('preview_click', { id: refs.off }), /disabled/)
  assert.equal(store.runtimeState.open, false)
  // Conditions of repeated copies read their own item, so they are not judged from outside.
  run('preview_click', { id: refs.repeated })
  run('preview_click', { id: refs.inside })
})

test('a condition of the shared layout around the page counts too', async () => {
  const run = await runner()
  run('set_state', { name: 'signedIn', value: false })
  const { id } = run('add_component', { type: 'VBtn', text: 'Go' })
  run('set_event', { id, click: { type: 'notify', message: 'Hi' } })
  store.editLayout(true)
  const app = store.rootNode.children[0]
  app.children.find(node => node.type === 'VMain').vIf = 'signedIn'
  store.editLayout(false)
  run('preview_start')
  assert.throws(() => run('preview_click', { id }), /hidden/)
})

test('the wizard takes the words of its controls from the settings', () => {
  store.addTemplate('wizard', { nextLabel: 'Далі', stepLabel: 'Крок {number} з {total}', nameLabel: 'Позивний' })
  const words = node => [node.name, node.props.label, ...node.children.flatMap(words)]
  const all = words(store.rootNode.children.at(-1))
  for (const word of ['Далі', 'Крок 2 з 3', 'Позивний']) assert.ok(all.includes(word), word)
  assert.ok(!all.includes('Next'))
})

test('one copy of a repeated element is clicked, with its own item', async () => {
  const run = await runner()
  run('set_state', { name: 'query', value: '' })
  run('set_state', { name: 'chosen', value: 'none' })
  run('set_state', { name: 'cities', value: ['Mars', 'Moon', 'Titan'] })
  const { refs } = run('add_subtree', {
    tree: {
      type: 'div',
      children: [
        {
          type: 'VBtn',
          ref: 'city',
          text: '{{item}}',
          vFor: 'cities',
          vIf: 'empty(query) or contains(lower(item), lower(query))',
          click: { type: 'set', key: 'chosen', value: '{{item}}' },
        },
      ],
    },
  })
  const id = refs.city
  run('preview_start')
  assert.throws(() => run('preview_click', { id }), /shown 3 times: say which with copy \(0 to 2\)/)
  run('preview_click', { id, copy: 1 })
  assert.equal(store.runtimeState.chosen, 'Moon')

  // The number is that of the copies shown, as a person counts them.
  store.runtimeState.query = 'T'
  run('preview_click', { id, copy: 0 })
  assert.equal(store.runtimeState.chosen, 'Titan')
  assert.throws(() => run('preview_click', { id, copy: 1 }), /has no copy 1/)
  store.runtimeState.query = 'venus'
  assert.throws(() => run('preview_click', { id }), /hidden/)
})

test('lower() compares texts whatever their case, in Preview and in exported code', async () => {
  const model = '/src/modules/ui-builder/entities/ui-node/model/'
  const { evaluateExpression, expressionError } = await server.ssrLoadModule(`${model}expression.ts`)
  const { expressionToJs, helperSources } = await server.ssrLoadModule(`${model}expressionToJs.ts`)
  const text = 'contains(lower(name), lower(query))'
  const helpers = new Set()
  const code = expressionToJs(text, new Set(['name', 'query']), helpers)
  const exported = new Function('name', 'query', `${helperSources(helpers).join('\n')}\nreturn ${code}`)
  for (const [name, query, expected] of [
    ['Марс', 'марс', true],
    ['Mars', 'AR', true],
    ['Mars', 'x', false],
    ['Mars', null, true],
  ]) {
    assert.equal(evaluateExpression(text, { name, query }), expected, `${name}/${query}`)
    assert.equal(exported(name, query), expected, `exported ${name}/${query}`)
  }
  assert.equal(evaluateExpression('lower(missing)', {}), '')
  assert.match(expressionError('upper(name)'), /length, empty, lower, contains/)
})
