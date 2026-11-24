import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import { codegen, exportTargets, pascalCase, runtime, store } from './support.mjs'

const SCOPE = {
  age: 20,
  role: 'admin',
  count: 3,
  status: 'paid',
  open: false,
  email: 'ann',
  rows: [1, 2],
  tags: ['new'],
  user: { name: 'Anna' },
  row: { step: 2 },
  missing: undefined,
}
const CONDITIONS = [
  'open',
  '!open',
  'not open',
  'status == paid',
  'status != "paid"',
  'count >= 3 and role == "admin"',
  'count > 5 or not open',
  '(count > 5 || open) && status == paid',
  'contains(rows, 2) && length(rows) == 2',
  'empty(rows) ? open : count == 3',
  'not empty(email) and not contains(email, "@")',
  'user.name == Anna',
  'row.step >= 2',
  'age * 2 >= 40',
  'missing.deep.value',
  'missing > 1 or tags[0] == "new"',
  'user.constructor == 1',
  'count - 1 == 2',
  '-count < 0',
  'rows[5] == 1',
]

/** Runs the exported JavaScript with the same variables, so it can be compared with the editor's own answer. */
function runExported(condition) {
  const helpers = new Set()
  const js = codegen.expressionToJs(condition, new Set(Object.keys(SCOPE)), helpers)
  const names = Object.keys(SCOPE)
  const run = new Function(...names, `${codegen.helperSources(helpers).join('\n')}\nreturn ${js}`)
  return Boolean(run(...names.map(name => SCOPE[name])))
}

test('an exported condition decides exactly like the editor does', () => {
  for (const condition of CONDITIONS)
    assert.equal(runExported(condition), runtime.evaluateCondition(condition, SCOPE), condition)
})

test('a condition that cannot be read becomes true, as in Preview', () => {
  assert.equal(codegen.expressionToJs('open &&', new Set(), new Set()), 'true')
})

function buildPage() {
  store.setStateVariable('open', false)
  store.setStateVariable('rows', [{ name: 'Apple', stock: 0 }])
  store.setStateVariable('name', '')
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.updateNodeLogic(button, { vIf: 'not empty(name) and open', events: { click: { type: 'toggle', key: 'open' } } })
  store.addComponent('VTextField')
  store.updateNodeLogic(store.selectedNodeId, { model: 'name' })
  store.addComponent('VCard')
  const card = store.selectedNodeId
  store.updateNodeLogic(card, {
    vFor: 'rows',
    vIf: 'item.stock == 0',
    events: { click: { type: 'set', key: 'picked', value: '{{item}}' } },
  })
}

test('a page is exported as a single-file component that Vue can compile', () => {
  buildPage()
  const page = store.pages[0]
  const { code, fileName } = codegen.exportPage(page, store.project.state, 'Home.vue')
  assert.equal(fileName, 'Home.vue')
  const { descriptor, errors } = parse(code)
  assert.deepEqual(errors, [])
  assert.ok(descriptor.scriptSetup && descriptor.template)
  const compiled = compileTemplate({ source: descriptor.template.content, id: 'page', filename: 'Home.vue' })
  assert.deepEqual(compiled.errors, [])
  assert.match(code, /const open = ref\(false\)/)
  assert.match(code, /const picked = ref\(''\)/, 'a variable that is only written still exists')
  assert.match(code, /v-model="name"/)
  assert.match(code, /@click\.stop="open = !open"/)
  assert.match(code, /v-if="\(!isEmpty\(name\) && open\)"/)
  assert.match(code, /const isEmpty = /)
  // Both a repeat and a condition: the repeat wraps the element so the condition can read `item`.
  assert.match(
    code,
    /<template v-for="\(item, index\) in rows\?" :key="index">|<template v-for="\(item, index\) in rows" :key="index">/,
  )
  assert.match(code, /picked = copyOf\(item\)/)
})

test('a saved component becomes props and the layout outlet a router view', () => {
  store.addComponent('VBtn')
  const button = store.selectedNodeId
  store.updateNodeLogic(button, {
    vIf: 'destination == {{props.key}}',
    events: { click: { type: 'navigate', to: '/{{props.page}}' } },
  })
  store.savePrefab(button, 'Link', { key: 'home', page: 'start' })
  const prefab = store.prefabs[0]
  const { code } = codegen.exportPrefab(prefab, store.project.state, 'Link.vue')
  assert.deepEqual(parse(code).errors, [])
  assert.match(code, /const props = defineProps\(\{/)
  assert.match(code, /key: \{ type: String, default: 'home' \}/)
  assert.match(code, /router\.push\(`\/\$\{props\?\.page \?\? ''\}`\)/)
  assert.match(code, /import \{ useRouter \} from 'vue-router'/)
})

test('file names are made from page and component names', () => {
  assert.equal(pascalCase.toPascalCase('order desk'), 'OrderDesk')
  assert.equal(pascalCase.toPascalCase('TestComplexComponent'), 'TestComplexComponent')
  assert.equal(pascalCase.toPascalCase('  --  '), '')
})

test('the export dialog lists every page, the layout and every saved component with unique file names', () => {
  store.addPage('Order desk')
  store.addPage('Order-desk')
  store.addComponent('VBtn')
  store.savePrefab(store.selectedNodeId, 'Order desk', {})
  const targets = exportTargets.buildExportTargets(store.project, store.prefabs)
  const names = targets.map(target => target.file.fileName)
  assert.equal(new Set(names).size, names.length, names.join(', '))
  assert.ok(names.includes('OrderDesk.vue') && names.includes('OrderDesk2.vue') && names.includes('OrderDesk3.vue'))
  const kinds = new Set(targets.map(target => target.kind))
  assert.ok(kinds.has('page') && kinds.has('component'))
  for (const target of targets) assert.deepEqual(parse(target.file.code).errors, [], target.title)
  const editing = { prefab: null, layout: false, page: store.activePage }
  assert.equal(exportTargets.defaultTargetId(editing), store.activePage.id)
  assert.equal(exportTargets.defaultTargetId({ ...editing, layout: true }), 'layout')
  assert.equal(exportTargets.defaultTargetId({ ...editing, prefab: store.prefabs[0] }), store.prefabs[0].prefabId)
})

test('the shared layout is exported with a router view where the page goes', () => {
  store.editLayout(true)
  const layout = exportTargets.buildExportTargets(store.project, store.prefabs).find(target => target.kind === 'layout')
  assert.ok(layout, 'the layout is offered')
  assert.deepEqual(parse(layout.file.code).errors, [])
  assert.match(layout.file.code, /<RouterView \/>/)
  assert.equal(layout.file.fileName, 'SharedLayout.vue')
})
