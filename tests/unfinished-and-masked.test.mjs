import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { codegen, runtime, server, store } from './support.mjs'

/** The exported page, after checking that Vue can compile it. */
function exported() {
  const { code } = codegen.exportPage(store.pages[0], store.project.state, 'Page.vue')
  const { descriptor, errors } = parse(code)
  assert.deepEqual(errors, [])
  const bindings = descriptor.scriptSetup ? compileScript(descriptor, { id: 'x' }).bindings : {}
  const compiled = compileTemplate({
    source: descriptor.template.content,
    filename: 'Page.vue',
    id: 'x',
    compilerOptions: { bindingMetadata: bindings },
  })
  assert.deepEqual(compiled.errors, [])
  return code
}

const audit = async () => {
  const { auditProject } = await server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/projectAudit.ts')
  return auditProject(store.project)
}

const addWith = (type, logic) => {
  store.selectNode(null)
  store.addComponent(type)
  store.updateNodeLogic(store.selectedNodeId, logic)
  return store.selectedNodeId
}

test('a click action with no variable exports code that compiles, and the audit reports it', async () => {
  addWith('VBtn', { events: { click: { type: 'toggle', key: '' } } })
  addWith('VBtn', { events: { click: { type: 'set', key: '', value: 'true' } } })
  addWith('VDataTable', { events: { click: { type: 'set', key: '', value: '{{item}}' } } })
  const code = exported()
  // The button still keeps its click to itself, as in Preview.
  assert.equal(code.match(/@click\.stop(?!=)/g).length, 2)
  assert.doesNotMatch(code, /@click:row|copyOf/)
  const problems = (await audit()).filter(issue => issue.kind === 'missing-variable')
  assert.equal(problems.length, 3)
  assert.equal(problems[0].severity, 'error')
})

test('a masked input is exported with the mask', () => {
  store.setStateVariable('phone', '')
  const id = addWith('VTextField', { model: 'phone' })
  store.updateNodeProp(id, 'mask', '(##) ##-##')
  const code = exported()
  assert.match(code, /:model-value="phone"/)
  assert.match(code, /@update:model-value="phone = applyInputMask\(\$event, '\(##\) ##-##'\)"/)
  assert.doesNotMatch(code, /v-model|\smask=/)
})

test('an input without a mask keeps v-model', () => {
  store.setStateVariable('name', '')
  addWith('VTextField', { model: 'name' })
  assert.match(exported(), /v-model="name"/)
})

test('the exported mask formats exactly like Preview', () => {
  const source = codegen.helperSources(new Set(['applyInputMask'])).join('\n')
  const exportedMask = new Function(`${source}\nreturn applyInputMask`)()
  for (const mask of ['##-##', '(##) ##', 'AA-##', '+38 (0##)', '#A#A'])
    for (const input of ['', '1', '12', '1234', '12-34', 'ab12', 'a1b2', '+38 (067', '(((', 'abc'])
      assert.equal(exportedMask(input, mask), runtime.applyMask(input, mask), `${mask} ${input}`)
  // Values that are not text, such as a cleared field, pass through, as in Preview.
  assert.equal(exportedMask(null, '##'), null)
})
