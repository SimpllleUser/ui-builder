import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { codegen, memoryProject, parseProject, server, store } from './support.mjs'

const model = '/src/modules/ui-builder/entities/ui-node/model/'
const load = path => server.ssrLoadModule(path)
const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms))

const add = (type, parent = 'root-canvas') => {
  store.addComponent(type, parent)
  return store.selectedNodeId
}
/** A contact form: two linked fields with rules, a submit button, and the list the contacts go to. */
const contactForm = () => {
  store.setStateVariable('name', '')
  store.setStateVariable('email', '')
  store.setStateVariable('contacts', [])
  const form = add('VForm')
  const [nameField, emailField, button] = store.findNodeById(form).children.map(child => child.id)
  store.updateNodeLogic(nameField, { model: 'name', rules: [{ type: 'required' }] })
  store.updateNodeLogic(emailField, { model: 'email', rules: [{ type: 'email', message: 'Bad "email"' }] })
  store.updateNodeLogic(form, {
    events: {
      submit: [
        { type: 'append', key: 'contacts', value: '{"name": "{{name}}", "email": "{{email}}"}' },
        { type: 'notify', message: 'Added {{name}}' },
        { type: 'resetForm' },
      ],
    },
  })
  return { form, nameField, emailField, button }
}

test('a form is submitted only when its rules pass, then its actions run in order', () => {
  const { form, nameField, emailField, button } = contactForm()
  store.startPreview()
  store.previewInput(emailField, 'nope')
  const errors = store.previewClick(button)
  assert.deepEqual(
    errors.map(error => error.message),
    ['This field is required.', 'Bad "email"'],
  )
  assert.deepEqual(store.runtimeState.contacts, [])
  assert.equal(store.describePreview().inputs[1].error, 'Bad "email"')

  store.previewInput(nameField, 'Ann "A"')
  store.previewInput(emailField, 'ann@example.com')
  assert.deepEqual(store.previewSubmit(form), [])
  assert.deepEqual(store.runtimeState.contacts, [{ name: 'Ann "A"', email: 'ann@example.com' }])
  assert.equal(store.describePreview().message, 'Added Ann "A"')
  assert.deepEqual([store.runtimeState.name, store.runtimeState.email], ['', ''])
})

test('list actions add and remove values, and change actions see the new value', () => {
  store.setStateVariable('tags', ['a', 'b', 'a'])
  store.setStateVariable('choice', '')
  const select = add('VSelect')
  store.updateNodeLogic(select, {
    model: 'choice',
    events: { change: { type: 'append', key: 'tags', value: '{{value}}' } },
  })
  const button = add('VBtn')
  store.updateNodeLogic(button, { events: { click: { type: 'remove', key: 'tags', value: 'a' } } })
  store.startPreview()
  store.previewInput(select, 'c')
  store.previewClick(button)
  assert.deepEqual(store.runtimeState.tags, ['b', 'a', 'c'])
})

test('computed variables follow their inputs, cannot be written and refuse cycles', () => {
  store.setStateVariable('rows', [1, 2])
  store.setStateVariable('first', 'Ada')
  assert.equal(store.setComputed('total', 'length(rows)'), true)
  assert.equal(store.setComputed('greeting', 'first + " (" + total + ")"'), true)
  assert.equal(store.setComputed('total', 'length(greeting)'), false, 'cycle')
  assert.equal(store.setComputed('rows', 'first'), false, 'name taken')
  assert.equal(store.setStateVariable('total', 5), false)
  assert.equal(store.startingState.greeting, 'Ada (2)')

  const button = add('VBtn')
  store.updateNodeLogic(button, {
    events: {
      click: [
        { type: 'append', key: 'rows', value: '3' },
        { type: 'set', key: 'total', value: '99' },
      ],
    },
  })
  store.startPreview()
  store.previewClick(button)
  assert.equal(store.runtimeState.total, 3)
  assert.equal(store.describePreview().variables.greeting, 'Ada (3)')
})

test('a data source starts empty and delivers the starting value after its delay', async () => {
  store.setStateVariable('orders', [{ id: 1 }])
  assert.equal(store.setDataSource('orders', { url: 'javascript:alert(1)', delayMs: 0 }), false)
  assert.equal(store.setDataSource('orders', { url: '/api/orders', delayMs: 5, loadingVariable: 'loading' }), true)
  store.startPreview()
  assert.deepEqual([store.runtimeState.orders, store.runtimeState.loading], [[], true])
  await wait()
  assert.deepEqual([store.runtimeState.orders, store.runtimeState.loading], [[{ id: 1 }], false])
  store.removeStateVariable('orders')
  assert.equal(store.project.sources, undefined)
})

test('the new settings are saved, copied between projects and refused when damaged', () => {
  const { form } = contactForm()
  store.setComputed('total', 'length(contacts)')
  store.setDataSource('contacts', { url: '/api/contacts', delayMs: 1 })
  const text = add('VCardTitle')
  store.findNodeById(text).children.length = 0
  store.findNodeById(text).props.title = '{{total}}'
  const saved = store.exportDocument()
  const reread = parseProject(saved)
  assert.deepEqual([reread.computed, reread.sources], [store.project.computed, store.project.sources])

  store.selectedNodeIds = [form, text]
  const copied = store.copySelection()
  const empty = JSON.parse(saved)
  Object.assign(empty, { state: {}, computed: undefined, sources: undefined })
  empty.pages[0].root.children = []
  store.openProject(memoryProject(JSON.stringify(empty)).opened())
  assert.equal(store.pasteElements(copied), true)
  assert.deepEqual(store.project.computed, { total: 'length(contacts)' })
  assert.ok(store.project.sources.contacts)

  for (const damage of [
    document => (document.sources = { contacts: { url: 'file:///etc', delayMs: 0 } }),
    document => (document.computed = { total: 5 }),
    document => (document.pages[0].root.children[0].rules = [{ type: 'eval' }]),
    document => (document.pages[0].root.children[0].events = { hover: { type: 'toggle', key: 'a' } }),
  ]) {
    const document = JSON.parse(saved)
    damage(document)
    assert.throws(() => parseProject(JSON.stringify(document)))
  }
})

test('the check reports writes to computed variables, a reset outside a form and rules without a number', async () => {
  const { auditProject } = await load(`${model}projectAudit.ts`)
  store.setStateVariable('rows', [])
  store.setComputed('total', 'length(rows) + missing')
  const field = add('VTextField')
  store.updateNodeLogic(field, { model: 'total', rules: [{ type: 'minLength' }] })
  const button = add('VBtn')
  store.updateNodeLogic(button, { events: { click: { type: 'resetForm' } } })
  const kinds = auditProject(store.project).map(issue => issue.kind)
  for (const kind of ['read-only-variable', 'missing-form', 'invalid-rule', 'unknown-variable'])
    assert.ok(kinds.includes(kind), kind)
})

const compiles = (code, name) => {
  const { descriptor, errors } = parse(code, { filename: name })
  assert.deepEqual(errors, [])
  const script = descriptor.scriptSetup ? compileScript(descriptor, { id: name }) : null
  const result = compileTemplate({
    source: descriptor.template.content,
    filename: name,
    id: name,
    compilerOptions: { bindingMetadata: script?.bindings },
  })
  assert.deepEqual(result.errors, [], code)
}

test('exported code keeps rules, events, computed variables and data sources, and compiles', async () => {
  const { emailField } = contactForm()
  store.setComputed('total', 'length(contacts)')
  store.setDataSource('contacts', { url: '/api/contacts', delayMs: 1, loadingVariable: 'loading' })
  store.updateNodeLogic(emailField, {
    model: 'email',
    rules: [{ type: 'maxLength', value: '40' }],
    events: {
      change: [
        { type: 'notify', message: 'Changed "it" to {{value}}' },
        { type: 'remove', key: 'contacts', value: '{{value}}' },
      ],
    },
  })
  store.findNodeById(emailField).props.mask = 'AAA'
  const title = add('VCardTitle')
  store.updateNodeLogic(title, { vIf: 'total > 0', events: { mounted: { type: 'toggle', key: 'seen' } } })

  const { code } = codegen.exportPage(store.activePage, store.project.state, 'Home.vue', 'local', store.project)
  compiles(code, 'Home.vue')
  assert.match(code, /:rules="\[value => /)
  assert.match(code, /@submit\.prevent="async event => \{ if \(!\(await event\)\.valid\) return; /)
  assert.match(code, /const total = computed\(\(\) => lengthOf\(contacts\.value\)\)/)
  assert.match(code, /fetch\('\/api\/contacts'\)/)
  assert.match(code, /const loading = ref\(true\)/)
  assert.match(code, /const resetForm1 = \(\) => \{/)
  assert.match(code, /ref="form1"/)
  assert.match(code, /@vue:mounted="seen = !seen"/)
  assert.match(code, /<VSnackbar/)

  const { buildVueProject } = await load('/src/modules/ui-builder/widgets/code-export/model/vueProject.ts')
  const { files } = buildVueProject({
    name: 'Demo',
    project: store.project,
    prefabs: [],
    vuetifyConfig: '',
    themeCss: '',
    tableCss: '',
  })
  for (const [path, content] of Object.entries(files)) if (path.endsWith('.vue')) compiles(content, path)
  assert.deepEqual(JSON.parse(files['public/api/contacts']), [])
  assert.match(files['src/stores/project.js'], /const total = computed/)
  assert.match(files['src/stores/project.js'], /fetch\('\/api\/contacts'\)/)
  assert.ok(files['src/stores/messages.js'])
  assert.match(files['src/App.vue'], /useMessagesStore/)
})

test('CSV and JSON files become values', async () => {
  const { parseDataFile } = await load('/src/modules/ui-builder/features/import-data/model/parseDataFile.ts')
  assert.deepEqual(parseDataFile('a.csv', '﻿name;zip;active\r\n"Ann; ""A""";007;true\r\n\r\nBob;12.5;false\n'), [
    { name: 'Ann; "A"', zip: '007', active: true },
    { name: 'Bob', zip: 12.5, active: false },
  ])
  assert.deepEqual(parseDataFile('a.json', '[1]'), [1])
  assert.throws(() => parseDataFile('a.json', '{'), /valid JSON/)
  assert.throws(() => parseDataFile('a.csv', 'a\n"open'), /not closed/)
})

test('MCP tools set events, rules, computed variables and data sources, and try a form', async () => {
  const { executeMcpCommand } = await load('/src/modules/ui-builder/features/mcp-bridge/model/mcpCommands.ts')
  const run = (command, args) => executeMcpCommand(store, command, args)
  run('set_state', { name: 'name', value: '' })
  const { refs } = run('add_subtree', {
    tree: {
      type: 'VForm',
      ref: 'form',
      events: { submit: { type: 'notify', message: 'ok' } },
      children: [{ type: 'VTextField', ref: 'field', model: 'name', rules: [{ type: 'minLength', value: 2 }] }],
    },
  })
  run('set_computed', { name: 'size', expression: 'length(name)' })
  run('set_data_source', { name: 'name', url: '/api/name', delayMs: 0 })
  run('set_data_source', { name: 'name', url: null })
  assert.throws(() => run('set_rules', { id: refs.form, rules: [] }), /not a form field/)
  assert.throws(() => run('set_event', { id: refs.form, submit: { type: 'eval' } }), /Invalid action/)
  run('set_event', { id: refs.field, change: [{ type: 'notify', message: '{{value}}' }] })
  run('preview_start', {})
  assert.equal(run('preview_input', { id: refs.field, value: 'a' }).message, 'a')
  assert.equal(run('preview_submit', { id: refs.form }).submitted, false)
  run('preview_input', { id: refs.field, value: 'ab' })
  const answer = run('preview_submit', { id: refs.form })
  assert.deepEqual([answer.submitted, answer.message, answer.variables.size], [true, 'ok', 2])
})

test('an unmasked linked field keeps v-model and runs its change actions after it', () => {
  store.setStateVariable('choice', '')
  store.setStateVariable('log', [])
  const select = add('VSelect')
  store.updateNodeLogic(select, {
    model: 'choice',
    events: { change: { type: 'append', key: 'log', value: '{{value}}' } },
  })
  const { code } = codegen.exportPage(store.activePage, store.project.state, 'Home.vue')
  compiles(code, 'Home.vue')
  assert.ok(code.indexOf('v-model="choice"') < code.indexOf('@update:model-value="value => log'))
})
