import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exportTargets, server, store } from './support.mjs'

const load = () => server.ssrLoadModule('/src/modules/ui-builder/entities/ui-node/model/prefabParameters.ts')

const saveButton = (definitions = []) => {
  store.addComponent('VBtn')
  const id = store.selectedNodeId
  store.updateNodeProp(id, 'disabled', '{{props.off}}')
  store.savePrefab(id, 'Action', {}, definitions)
  return store.prefabs[0]
}
const OFF = { name: 'off', type: 'boolean', defaultValue: 'false' }

test('values are checked by the type of the parameter', async () => {
  const { prefabValueError, prefabPropErrors } = await load()
  const errorOf = (prop, value) => prefabValueError({ name: 'p', defaultValue: '', ...prop }, value)
  assert.equal(errorOf({}, 'anything'), null)
  assert.match(errorOf({ maxLength: 2 }, 'abc'), /at most 2/)
  assert.match(errorOf({ type: 'number' }, 'x'), /number/)
  assert.match(errorOf({ type: 'number', min: 1, max: 5 }, '6'), /5 or less/)
  assert.match(errorOf({ type: 'boolean' }, 'yes'), /true or false/)
  assert.match(errorOf({ type: 'choice', options: ['a', 'b'] }, 'c'), /a, b/)
  assert.equal(errorOf({ type: 'color' }, '#1976d2'), null)
  assert.match(errorOf({ type: 'color' }, '12px'), /colour/)
  assert.match(errorOf({ type: 'link' }, 'javascript:alert(1)'), /Start with/)
  assert.equal(errorOf({ type: 'number' }, ''), null)
  assert.match(errorOf({ required: true }, ''), /required/)
  assert.ok(prefabPropErrors({ name: 'p', type: 'number', min: 2, max: 1, defaultValue: '' }).limits)
  assert.ok(prefabPropErrors({ name: 'p', type: 'number', defaultValue: 'x' }).defaultValue)
})

test('an instance gets real booleans and refuses a value of the wrong type', () => {
  const prefab = saveButton([OFF])
  store.insertPrefab(prefab.prefabId, store.rootNode.id)
  const id = store.selectedNodeId
  assert.equal(store.findNodeById(id).props.disabled, false)
  assert.equal(store.setInstanceProps(id, { off: 'maybe' }), false)
  assert.match(store.notice, /off: Use true or false/)
  assert.ok(store.setInstanceProps(id, { off: 'true' }))
  assert.equal(store.findNodeById(id).props.disabled, true)
  assert.equal(store.insertPrefab(prefab.prefabId, store.rootNode.id, null, { off: '1' }), false)
})

test('a boolean left empty is false, not an empty text that Vue would read as true', () => {
  const prefab = saveButton([{ ...OFF, defaultValue: '' }])
  store.insertPrefab(prefab.prefabId, store.rootNode.id)
  assert.equal(store.findNodeById(store.selectedNodeId).props.disabled, false)
})

test('a parameter created by hand stays, and a used one removed comes back as text', () => {
  const { prefabId } = saveButton()
  const size = { name: 'size', type: 'choice', options: ['s', 'l'], defaultValue: 's', isDeclared: true }
  assert.equal(store.setPrefabParameter(prefabId, size), null)
  assert.match(store.setPrefabParameter(prefabId, { ...size, defaultValue: 'xl' }), /Choose one of/)
  assert.equal(store.setPrefabParameter(prefabId, OFF), null)
  assert.deepEqual(
    store.prefabs[0].props.map(prop => prop.name),
    ['off', 'size'],
  )
  store.removePrefabParameter(prefabId, 'off')
  store.removePrefabParameter(prefabId, 'size')
  assert.deepEqual(store.prefabs[0].props, [{ name: 'off', defaultValue: '' }])
})

test('exported components declare the types and checks', () => {
  saveButton([OFF, { name: 'count', type: 'number', min: 1, defaultValue: '', isDeclared: true }])
  const target = exportTargets.buildExportTargets(store.project, store.prefabs).at(-1)
  assert.match(target.file.code, /off: \{ type: Boolean, default: false \},/)
  assert.match(target.file.code, /count: \{ type: Number, validator: value => value >= 1 \},/)
})
