import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { codegen, server, store } from './support.mjs'

const chips = () => server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/statusChips.ts')

function addTable(headers) {
  store.addComponent('VDataTable')
  const id = store.selectedNodeId
  store.updateNodeProp(id, 'headers', headers)
  return id
}

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

test('a status chip column is exported as a chip with the colors of Preview', async () => {
  const { STATUS_COLORS, statusColor } = await chips()
  addTable([
    { title: 'Name', key: 'name' },
    { title: 'Status', key: 'status', chip: true },
  ])
  const code = exported()
  assert.match(code, /<template #item\.status="\{ value \}">/)
  assert.doesNotMatch(code, /#item\.name/)
  assert.match(code, /<VChip size="small" variant="tonal" :color="statusChipColor\(value\)">/)

  const source = codegen.helperSources(new Set(['statusChipColor'])).join('\n')
  const exportedColor = new Function(`${source}\nreturn statusChipColor`)()
  for (const value of [...Object.keys(STATUS_COLORS), 'PAID', 'other', 'constructor', null, undefined])
    assert.equal(exportedColor(value), statusColor(value), String(value))
})

test('a cell with its own content is not replaced by a chip', () => {
  const id = addTable([{ title: 'Status', key: 'status', chip: true }])
  store.addComponent('VBtn')
  const button = store.findNodeById(store.selectedNodeId)
  store.updateSlotChildren(id, 'item.status', [JSON.parse(JSON.stringify({ ...button, id: 'own-cell' }))])
  const code = exported()
  assert.equal(code.match(/#item\.status/g).length, 1)
  assert.doesNotMatch(code, /VChip/)
})

test('a column key that cannot be a plain slot name still gets its chip', () => {
  addTable([{ title: 'Status', key: "order's state", chip: true }])
  const code = exported()
  assert.match(code, /v-for="key in \['order\\'s state'\]" #\[`item\.\$\{key\}`\]/)
})

test('columns that come from a variable get their chips while the page runs', async () => {
  const { chipColumnKeys } = await chips()
  store.setStateVariable('columns', [{ key: 'status', chip: true }, { key: 'name' }, null])
  addTable('{{columns}}')
  const code = exported()
  assert.match(code, /v-for="key in statusChipKeys\(columns\)"/)

  const source = codegen.helperSources(new Set(['statusChipKeys'])).join('\n')
  const exportedKeys = new Function(`${source}\nreturn statusChipKeys`)()
  for (const headers of [store.project.state.columns, undefined, 'text', []])
    assert.deepEqual(exportedKeys(headers), chipColumnKeys(headers))
})

test('a table without chip columns needs no helpers', () => {
  addTable([{ title: 'Name', key: 'name' }])
  assert.doesNotMatch(exported(), /VChip|statusChip/)
})
